/**
 * Maintenance Engine — Lógica de negócio central do LabCare.
 *
 * Este módulo é independente de rotas HTTP e pode ser chamado por API Routes,
 * Server Actions, cron jobs ou qualquer outro contexto server-side.
 *
 * Hierarquia de herança de planos:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Nível BASE          │ classificacaoId=NULL, modeloId=NULL               │
 * │                     │ Aplica-se a TODOS os equipamentos do Tipo.        │
 * ├─────────────────────┼───────────────────────────────────────────────────┤
 * │ Nível CLASSIFICAÇÃO │ classificacaoId=PK, modeloId=NULL                 │
 * │                     │ Herda os itens do Base + adiciona itens próprios. │
 * ├─────────────────────┼───────────────────────────────────────────────────┤
 * │ Nível MODELO        │ classificacaoId=PK, modeloId=PK                  │
 * │                     │ Herda itens dos 2 anteriores + itens do Modelo.   │
 * └─────────────────────┴───────────────────────────────────────────────────┘
 *
 * Um equipamento do tipo "Multímetro" / classificação "Portátil" / modelo "MT-4090"
 * recebe os itens de TODOS os planos cujo nível se aplica a ele:
 *   → plano base (tipo Multímetro, sem filtro)
 *   → plano classificação (classificação = Portátil)
 *   → plano modelo (modelo = MT-4090), se existir
 */

import { addDays, differenceInCalendarDays } from "date-fns";
import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  equipamento,
  historicoManutencao,
  manutencaoProgramada,
  planoItem,
  planoManutencao,
  type Periodicidade,
} from "@/db/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PlanoItemConsolidado {
  planoManutencaoId: string;
  planoManutencaoNome: string;
  nivel: "base" | "classificacao" | "modelo";
  planoItemId: string;
  nome: string;
  descricao: string | null;
  periodicidade: Periodicidade;
  categoria: string;
}

export interface ManutencaoProgramadaInput {
  equipamentoId: string;
  planoItemId: string;
  dataPrevista: Date;
}

export interface ConcluirManutencaoInput {
  dataExecutada: Date;
  responsavelId: string;
  observacoes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapeia cada periodicidade (enum) para a quantidade de dias que ela representa.
 * Usado por calcularProximaData e gerarManutencoesParaEquipamento.
 */
function periodicidadeEmDias(periodicidade: Periodicidade): number {
  const mapa: Record<Periodicidade, number> = {
    diario: 1,
    semanal: 7,
    quinzenal: 15,
    mensal: 30,
    trimestral: 90,
    semestral: 180,
    anual: 365,
  };
  return mapa[periodicidade];
}

// ─── 1. getPlanoConsolidado ───────────────────────────────────────────────────

/**
 * Retorna a lista consolidada de todos os PlanoItens que um equipamento deve
 * seguir, juntando os 3 níveis de herança.
 *
 * Lógica:
 *  1. Busca o equipamento para obter tipoEquipamentoId, classificacaoId, modeloId.
 *  2. Busca planosManutencao nos 3 níveis:
 *     - base:       nivel='base'  E classificacaoId IS NULL E modeloId IS NULL
 *     - classificação: nivel='classificacao' E classificacaoId = do equipamento
 *     - modelo:     nivel='modelo' E modeloId = do equipamento
 *  3. Para cada plano encontrado, busca seus planoItem (apenas status='ativo').
 *  4. Concatena tudo em ordem: base → classificação → modelo.
 *
 * @throws Error se o equipamento não for encontrado.
 */
export async function getPlanoConsolidado(equipamentoId: string): Promise<PlanoItemConsolidado[]> {
  // 1. Busca o equipamento para obter os IDs de classificação e modelo.
  const [equip] = await db
    .select({
      id: equipamento.id,
      tipoEquipamentoId: equipamento.tipoEquipamentoId,
      classificacaoId: equipamento.classificacaoId,
      modeloId: equipamento.modeloId,
    })
    .from(equipamento)
    .where(eq(equipamento.id, equipamentoId))
    .limit(1);

  if (!equip) {
    throw new Error(`Equipamento "${equipamentoId}" não encontrado.`);
  }

  // 2. Busca os planos de manutenção nos 3 níveis de herança.
  //    Nível BASE: plano que se aplica a TODOS os equipamentos do tipo.
  //    O plano base NÃO tem classificacaoId nem modeloId — é genérico.
  const planosBase = await db
    .select()
    .from(planoManutencao)
    .where(
      and(
        eq(planoManutencao.nivel, "base"),
        isNull(planoManutencao.classificacaoId),
        isNull(planoManutencao.modeloId),
      ),
    );

  //    Nível CLASSIFICAÇÃO: plano específico para a classificação do equipamento.
  //    Herda tudo do base e adiciona itens específicos dessa classificação.
  const planosClassificacao = await db
    .select()
    .from(planoManutencao)
    .where(
      and(
        eq(planoManutencao.nivel, "classificacao"),
        eq(planoManutencao.classificacaoId, equip.classificacaoId),
        isNull(planoManutencao.modeloId),
      ),
    );

  //    Nível MODELO: plano específico para o modelo exato do equipamento.
  //    Herda dos 2 anteriores e adiciona itens do modelo.
  const planosModelo = await db
    .select()
    .from(planoManutencao)
    .where(and(eq(planoManutencao.nivel, "modelo"), eq(planoManutencao.modeloId, equip.modeloId)));

  // Junta todos os planos na ordem de herança.
  const todosPlanos = [...planosBase, ...planosClassificacao, ...planosModelo];

  if (todosPlanos.length === 0) {
    return [];
  }

  const planoIds = todosPlanos.map((p) => p.id);

  // 3. Busca os itens de todos os planos de uma vez (query IN).
  //    Apenas itens com status='ativo' participam do plano consolidado.
  const itensDosPlanos = await db
    .select({
      planoManutencaoId: planoItem.planoManutencaoId,
      planoManutencaoNome: planoManutencao.nome,
      nivel: planoManutencao.nivel,
      planoItemId: planoItem.id,
      nome: planoItem.nome,
      descricao: planoItem.descricao,
      periodicidade: planoItem.periodicidade,
      categoria: planoItem.categoria,
    })
    .from(planoItem)
    .innerJoin(planoManutencao, eq(planoItem.planoManutencaoId, planoManutencao.id))
    .where(
      and(
        // Drizzle não tem `inArray` no neon-http; usamos OR para cada ID.
        // Para poucos planos (3 no máximo), isso é eficiente.
        ...planoIds.map((id) => eq(planoItem.planoManutencaoId, id)),
        eq(planoItem.status, "ativo"),
      ),
    );

  // 4. Retorna em ordem: base → classificação → modelo.
  //    Cada item traz a referência do plano pai para rastreabilidade.
  return itensDosPlanos.map((item) => ({
    planoManutencaoId: item.planoManutencaoId,
    planoManutencaoNome: item.planoManutencaoNome,
    nivel: item.nivel,
    planoItemId: item.planoItemId,
    nome: item.nome,
    descricao: item.descricao,
    periodicidade: item.periodicidade,
    categoria: item.categoria,
  }));
}

// ─── 2. gerarManutencoesParaEquipamento ───────────────────────────────────────

/**
 * Ao cadastrar um equipamento novo, busca o plano consolidado e cria um
 * registro em ManutencaoProgramada para cada PlanoItem ativo.
 *
 * A primeira dataPrevista é calculada como:
 *   dataCadastro + periodicidade do item
 *
 * Por exemplo, se o equipamento foi cadastrado em 01/07/2026 e o item tem
 * periodicidade "mensal", a primeira data prevista será 31/07/2026.
 *
 * @throws Error se o equipamento não for encontrado ou não tiver plano.
 * @returns quantidade de manutenções programadas criadas.
 */
export async function gerarManutencoesParaEquipamento(equipamentoId: string): Promise<number> {
  // 1. Busca o equipamento para obter a dataCadastro.
  const [equip] = await db
    .select({ id: equipamento.id, dataCadastro: equipamento.dataCadastro })
    .from(equipamento)
    .where(eq(equipamento.id, equipamentoId))
    .limit(1);

  if (!equip) {
    throw new Error(`Equipamento "${equipamentoId}" não encontrado.`);
  }

  // 2. Busca o plano consolidado (herança de 3 níveis).
  const planoConsolidado = await getPlanoConsolidado(equipamentoId);

  if (planoConsolidado.length === 0) {
    throw new Error(
      `Nenhum plano de manutenção encontrado para o equipamento "${equipamentoId}". ` +
        `Verifique se existem planos com nível "base" ou que correspondam ` +
        `à classificação/modelo do equipamento.`,
    );
  }

  // 3. Para cada item, calcula a primeira data prevista e insere.
  const dataCadastro = new Date(equip.dataCadastro);
  const inserts: ManutencaoProgramadaInput[] = planoConsolidado.map((item) => ({
    equipamentoId,
    planoItemId: item.planoItemId,
    // dataPrevista = dataCadastro + periodicidade em dias
    dataPrevista: addDays(dataCadastro, periodicidadeEmDias(item.periodicidade)),
  }));

  await db.insert(manutencaoProgramada).values(
    inserts.map((i) => ({
      equipamentoId: i.equipamentoId,
      planoItemId: i.planoItemId,
      dataPrevista: i.dataPrevista,
      status: "programada" as const,
    })),
  );

  return inserts.length;
}

// ─── 3. calcularProximaData ──────────────────────────────────────────────────

/**
 * Retorna a próxima data de vencimento somando a periodicidade à data de
 * execução (NÃO à data prevista original).
 *
 * Isso é intencional: se a manutenção foi executada com atraso ou adiantamento,
 * a próxima ocorrência parte da data em que realmente foi feita, garantindo
 * o intervalo correto entre execuções.
 *
 * Exemplo:
 *   dataExecutada = 2026-07-03 (executada 3 dias depois do previsto)
 *   periodicidade = "mensal"
 *   → proximaData = 2026-08-02 (30 dias depois da execução)
 *
 * @param dataExecutada Data em que a manutenção foi efetivamente executada.
 * @param periodicidade Intervalo de recorrência do item.
 * @returns Date com a próxima data de vencimento.
 */
export function calcularProximaData(dataExecutada: Date, periodicidade: Periodicidade): Date {
  return addDays(dataExecutada, periodicidadeEmDias(periodicidade));
}

// ─── 4. concluirManutencao ───────────────────────────────────────────────────

/**
 * Fluxo ao concluir uma manutenção programada:
 *
 *  1. Valida e busca a ManutencaoProgramada (deve existir e estar pendente/programada).
 *  2. Busca o PlanoItem associado para obter a periodicidade.
 *  3. Calcula diasAtraso = max(0, dias entre dataPrevista e dataExecutada).
 *  4. Calcula dataProximaManutencao = dataExecutada + periodicidade.
 *  5. Cria registro em HistoricoManutencao com todos os dados.
 *  6. Atualiza a ManutencaoProgramada original para status "concluida".
 *  7. Cria uma NOVA ManutencaoProgramada para o próximo ciclo.
 *
 * Tudo é feito em transação para garantir consistência.
 *
 * @throws Error se a manutenção não existir, não estiver em status válido,
 *         ou se o planoItem não for encontrado.
 */
export async function concluirManutencao(
  manutencaoProgramadaId: string,
  dados: ConcluirManutencaoInput,
): Promise<{ historico: string; proxima: string }> {
  // 1. Busca a manutenção programada com o planoItem relacionado.
  const [manut] = await db
    .select({
      id: manutencaoProgramada.id,
      equipamentoId: manutencaoProgramada.equipamentoId,
      planoItemId: manutencaoProgramada.planoItemId,
      dataPrevista: manutencaoProgramada.dataPrevista,
      status: manutencaoProgramada.status,
      periodicidade: planoItem.periodicidade,
    })
    .from(manutencaoProgramada)
    .innerJoin(planoItem, eq(manutencaoProgramada.planoItemId, planoItem.id))
    .where(eq(manutencaoProgramada.id, manutencaoProgramadaId))
    .limit(1);

  if (!manut) {
    throw new Error(`Manutenção programada "${manutencaoProgramadaId}" não encontrada.`);
  }

  // Valida que a manutenção pode ser concluída (deve estar programada ou pendente).
  if (manut.status !== "programada" && manut.status !== "pendente") {
    throw new Error(
      `Manutenção "${manutencaoProgramadaId}" está com status "${manut.status}". ` +
        `Apenas manutenções com status "programada" ou "pendente" podem ser concluídas.`,
    );
  }

  // 2. Calcula dias de atraso: diferença em dias entre dataPrevista e dataExecutada.
  //    Mínimo 0 — se executou antes do previsto, não tem atraso.
  const diasAtraso = Math.max(
    0,
    differenceInCalendarDays(dados.dataExecutada, new Date(manut.dataPrevista)),
  );

  // 3. Calcula a próxima data de vencimento.
  const dataProximaManutencao = calcularProximaData(dados.dataExecutada, manut.periodicidade);

  // 4. Executa tudo em transação.
  const result = await db.transaction(async (tx) => {
    // 4a. Cria o registro no histórico.
    const [hist] = await tx
      .insert(historicoManutencao)
      .values({
        manutencaoProgramadaId: manut.id,
        equipamentoId: manut.equipamentoId,
        planoItemId: manut.planoItemId,
        dataPrevista: new Date(manut.dataPrevista),
        dataExecutada: dados.dataExecutada,
        responsavelId: dados.responsavelId,
        status: "concluida",
        observacoes: dados.observacoes ?? null,
        diasAtraso,
        dataProximaManutencao,
      })
      .returning({ id: historicoManutencao.id });

    // 4b. Atualiza a manutenção programada original para "concluida".
    await tx
      .update(manutencaoProgramada)
      .set({ status: "concluida", atualizadoEm: new Date() })
      .where(eq(manutencaoProgramada.id, manut.id));

    // 4c. Cria a próxima manutenção programada (próximo ciclo).
    const [proxima] = await tx
      .insert(manutencaoProgramada)
      .values({
        equipamentoId: manut.equipamentoId,
        planoItemId: manut.planoItemId,
        dataPrevista: dataProximaManutencao,
        status: "programada",
      })
      .returning({ id: manutencaoProgramada.id });

    return { historicoId: hist.id, proximaId: proxima.id };
  });

  return {
    historico: result.historicoId,
    proxima: result.proximaId,
  };
}

// ─── 5. atualizarStatusVencidas ──────────────────────────────────────────────

/**
 * Varre todas as ManutencaoProgramada e muda o status de "programada" para
 * "pendente" quando a dataPrevista já passou (é anterior à data atual).
 *
 * Esta função é idempotente: pode ser chamada múltiplas vezes sem causar
 * efeitos colaterais (apenas manutenções com status="programada" e data
 * vencida são afetadas).
 *
 * Design para cron job:
 *   - Não lança exceções em caso de "nenhum registro afetado".
 *   - Retorna a quantidade de registros atualizados para logging.
 *   - Pode ser chamada por uma API route, Server Action, ou um cron job
 *     externo (ex: Vercel Cron, node-cron, etc).
 *
 * @returns Quantidade de manutenções que foram marcadas como pendentes.
 */
export async function atualizarStatusVencidas(): Promise<number> {
  const now = new Date();

  // 1. Conta quantas manutenções serão afetadas (para retornar o número).
  const candidatas = await db
    .select({ id: manutencaoProgramada.id })
    .from(manutencaoProgramada)
    .where(
      and(
        eq(manutencaoProgramada.status, "programada"),
        lte(manutencaoProgramada.dataPrevista, now),
      ),
    );

  if (candidatas.length === 0) {
    return 0;
  }

  // 2. Atualiza todas de uma vez.
  await db
    .update(manutencaoProgramada)
    .set({ status: "pendente", atualizadoEm: now })
    .where(
      and(
        eq(manutencaoProgramada.status, "programada"),
        lte(manutencaoProgramada.dataPrevista, now),
      ),
    );

  return candidatas.length;
}

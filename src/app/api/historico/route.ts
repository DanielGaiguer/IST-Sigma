import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  historicoManutencao,
  equipamento,
  planoItem,
  usuario,
  laboratorio,
  unidade,
} from "@/db/schema";
import { getServerSession } from "@/lib/auth";

/**
 * GET /api/historico
 *
 * Retorna registros de HistoricoManutencao (somente leitura — histórico é imutável).
 *
 * Filtros opcionais:
 *   - equipamentoId: filtra por equipamento específico
 *   - laboratorioId: filtra por laboratório (via join com equipamento)
 *   - responsavelId: filtra por responsável
 *   - status: filtra por status (concluida, cancelada, etc.)
 *   - dataInicio / dataFim: filtra por período de dataExecutada
 */

const selectHistoricoCompleto = {
  id: historicoManutencao.id,
  manutencaoProgramadaId: historicoManutencao.manutencaoProgramadaId,
  equipamentoId: historicoManutencao.equipamentoId,
  planoItemId: historicoManutencao.planoItemId,
  dataPrevista: historicoManutencao.dataPrevista,
  dataExecutada: historicoManutencao.dataExecutada,
  responsavelId: historicoManutencao.responsavelId,
  status: historicoManutencao.status,
  observacoes: historicoManutencao.observacoes,
  diasAtraso: historicoManutencao.diasAtraso,
  dataProximaManutencao: historicoManutencao.dataProximaManutencao,
  criadoEm: historicoManutencao.criadoEm,
  atualizadoEm: historicoManutencao.atualizadoEm,
  equipamentoPatrimonio: equipamento.patrimonio,
  equipamentoNumeroSerie: equipamento.numeroSerie,
  planoItemNome: planoItem.nome,
  planoItemCategoria: planoItem.categoria,
  responsavelNome: usuario.nome,
  laboratorioNome: laboratorio.nome,
  unidadeNome: unidade.nome,
} as const;

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const equipamentoId = url.searchParams.get("equipamentoId");
    const laboratorioId = url.searchParams.get("laboratorioId");
    const responsavelId = url.searchParams.get("responsavelId");
    const status = url.searchParams.get("status");
    const dataInicio = url.searchParams.get("dataInicio");
    const dataFim = url.searchParams.get("dataFim");

    const conditions = [];
    if (equipamentoId) conditions.push(eq(historicoManutencao.equipamentoId, equipamentoId));
    if (laboratorioId) conditions.push(eq(equipamento.laboratorioId, laboratorioId));
    if (responsavelId) conditions.push(eq(historicoManutencao.responsavelId, responsavelId));
    if (status)
      conditions.push(
        eq(
          historicoManutencao.status,
          status as "programada" | "pendente" | "em_andamento" | "concluida" | "cancelada",
        ),
      );
    if (dataInicio) conditions.push(gte(historicoManutencao.dataExecutada, new Date(dataInicio)));
    if (dataFim) conditions.push(lte(historicoManutencao.dataExecutada, new Date(dataFim)));

    let query = db
      .select(selectHistoricoCompleto)
      .from(historicoManutencao)
      .innerJoin(equipamento, eq(historicoManutencao.equipamentoId, equipamento.id))
      .innerJoin(planoItem, eq(historicoManutencao.planoItemId, planoItem.id))
      .leftJoin(usuario, eq(historicoManutencao.responsavelId, usuario.id))
      .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
      .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const records = await query;
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar histórico." }, { status: 500 });
  }
}

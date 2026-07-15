import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  equipamento,
  fabricante,
  modelo,
  tipoEquipamento,
  classificacao,
  unidade,
  laboratorio,
  manutencaoProgramada,
  historicoManutencao,
  planoItem,
} from "@/db/schema";
import { editarEquipamentoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { gerarManutencoesParaEquipamento } from "@/server/maintenance-engine";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;

    const [equip] = await db
      .select({
        id: equipamento.id,
        patrimonio: equipamento.patrimonio,
        numeroSerie: equipamento.numeroSerie,
        fabricanteId: equipamento.fabricanteId,
        modeloId: equipamento.modeloId,
        tipoEquipamentoId: equipamento.tipoEquipamentoId,
        classificacaoId: equipamento.classificacaoId,
        unidadeId: equipamento.unidadeId,
        laboratorioId: equipamento.laboratorioId,
        dataCadastro: equipamento.dataCadastro,
        situacao: equipamento.situacao,
        criadoEm: equipamento.criadoEm,
        atualizadoEm: equipamento.atualizadoEm,
        fabricanteNome: fabricante.nome,
        modeloNome: modelo.nome,
        tipoEquipamentoNome: tipoEquipamento.nome,
        classificacaoNome: classificacao.nome,
        unidadeNome: unidade.nome,
        laboratorioNome: laboratorio.nome,
      })
      .from(equipamento)
      .innerJoin(fabricante, eq(equipamento.fabricanteId, fabricante.id))
      .innerJoin(modelo, eq(equipamento.modeloId, modelo.id))
      .innerJoin(tipoEquipamento, eq(equipamento.tipoEquipamentoId, tipoEquipamento.id))
      .innerJoin(classificacao, eq(equipamento.classificacaoId, classificacao.id))
      .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id))
      .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
      .where(eq(equipamento.id, id))
      .limit(1);

    if (!equip) {
      return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
    }

    const manutencoesProgramadas = await db
      .select({
        id: manutencaoProgramada.id,
        planoItemId: manutencaoProgramada.planoItemId,
        dataPrevista: manutencaoProgramada.dataPrevista,
        status: manutencaoProgramada.status,
        criadoEm: manutencaoProgramada.criadoEm,
        planoItemNome: planoItem.nome,
        planoItemPeriodicidade: planoItem.periodicidade,
        planoItemCategoria: planoItem.categoria,
      })
      .from(manutencaoProgramada)
      .innerJoin(planoItem, eq(manutencaoProgramada.planoItemId, planoItem.id))
      .where(
        and(
          eq(manutencaoProgramada.equipamentoId, id),
          eq(manutencaoProgramada.status, "programada"),
        ),
      );

    const historico = await db
      .select({
        id: historicoManutencao.id,
        dataPrevista: historicoManutencao.dataPrevista,
        dataExecutada: historicoManutencao.dataExecutada,
        status: historicoManutencao.status,
        observacoes: historicoManutencao.observacoes,
        diasAtraso: historicoManutencao.diasAtraso,
        dataProximaManutencao: historicoManutencao.dataProximaManutencao,
        criadoEm: historicoManutencao.criadoEm,
        planoItemNome: planoItem.nome,
      })
      .from(historicoManutencao)
      .innerJoin(planoItem, eq(historicoManutencao.planoItemId, planoItem.id))
      .where(eq(historicoManutencao.equipamentoId, id));

    const totalConcluidas = historico.filter((h) => h.status === "concluida").length;
    const totalAtrasadas = historico.filter(
      (h) => h.status === "concluida" && (h.diasAtraso ?? 0) > 0,
    ).length;
    const mediaAtraso =
      totalConcluidas > 0
        ? Math.round(
            historico
              .filter((h) => h.status === "concluida")
              .reduce((sum, h) => sum + (h.diasAtraso ?? 0), 0) / totalConcluidas,
          )
        : 0;

    return NextResponse.json({
      ...equip,
      manutencoesProgramadas,
      historico,
      resumoHistorico: {
        totalRegistros: historico.length,
        totalConcluidas,
        totalAtrasadas,
        mediaDiasAtraso: mediaAtraso,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar equipamento." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem alterar equipamentos." },
        { status: 403 },
      );
    }
    const body = await request.json();
    const parsed = editarEquipamentoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(equipamento).where(eq(equipamento.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
    }

    if (existing.situacao === "descartado") {
      return NextResponse.json(
        { error: "Não é possível editar um equipamento descartado." },
        { status: 409 },
      );
    }

    const data = parsed.data;

    if (data.patrimonio && data.patrimonio !== existing.patrimonio) {
      const [conflict] = await db
        .select({ id: equipamento.id })
        .from(equipamento)
        .where(eq(equipamento.patrimonio, data.patrimonio))
        .limit(1);
      if (conflict) {
        return NextResponse.json(
          { error: "Já existe um equipamento com este patrimônio." },
          { status: 409 },
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validateRefs: Array<{ table: any; id: string; name: string }> = [];
    if (data.fabricanteId)
      validateRefs.push({ table: fabricante, id: data.fabricanteId, name: "Fabricante" });
    if (data.modeloId) validateRefs.push({ table: modelo, id: data.modeloId, name: "Modelo" });
    if (data.tipoEquipamentoId)
      validateRefs.push({
        table: tipoEquipamento,
        id: data.tipoEquipamentoId,
        name: "Tipo de equipamento",
      });
    if (data.classificacaoId)
      validateRefs.push({
        table: classificacao,
        id: data.classificacaoId,
        name: "Classificação",
      });
    if (data.unidadeId) validateRefs.push({ table: unidade, id: data.unidadeId, name: "Unidade" });
    if (data.laboratorioId)
      validateRefs.push({ table: laboratorio, id: data.laboratorioId, name: "Laboratório" });

    for (const ref of validateRefs) {
      const [record] = await db
        .select({ id: ref.table.id })
        .from(ref.table)
        .where(eq(ref.table.id, ref.id))
        .limit(1);
      if (!record) {
        return NextResponse.json({ error: `${ref.name} não encontrado(a).` }, { status: 400 });
      }
    }

    const classificacaoMudou =
      data.classificacaoId !== undefined && data.classificacaoId !== existing.classificacaoId;
    const modeloMudou = data.modeloId !== undefined && data.modeloId !== existing.modeloId;
    const reprocessarManutencoes = classificacaoMudou || modeloMudou;

    const [updated] = await db
      .update(equipamento)
      .set({ ...data, atualizadoEm: new Date() })
      .where(eq(equipamento.id, id))
      .returning();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "equipamento",
      registroId: id,
      valorAnterior: existing,
      valorNovo: updated,
    });

    if (classificacaoMudou) {
      const [antiga] = await db
        .select({ nome: classificacao.nome })
        .from(classificacao)
        .where(eq(classificacao.id, existing.classificacaoId))
        .limit(1);
      const [nova] = await db
        .select({ nome: classificacao.nome })
        .from(classificacao)
        .where(eq(classificacao.id, data.classificacaoId!))
        .limit(1);
      await registrarAuditoria({
        usuarioId: session.user.id,
        operacao: "UPDATE",
        entidade: "equipamento",
        registroId: id,
        valorAnterior: {
          classificacaoId: existing.classificacaoId,
          classificacaoNome: antiga?.nome,
        },
        valorNovo: { classificacaoId: data.classificacaoId, classificacaoNome: nova?.nome },
      });
    }

    if (data.laboratorioId !== undefined && data.laboratorioId !== existing.laboratorioId) {
      const [antigo] = await db
        .select({ nome: laboratorio.nome })
        .from(laboratorio)
        .where(eq(laboratorio.id, existing.laboratorioId))
        .limit(1);
      const [novo] = await db
        .select({ nome: laboratorio.nome })
        .from(laboratorio)
        .where(eq(laboratorio.id, data.laboratorioId!))
        .limit(1);
      await registrarAuditoria({
        usuarioId: session.user.id,
        operacao: "UPDATE",
        entidade: "equipamento",
        registroId: id,
        valorAnterior: { laboratorioId: existing.laboratorioId, laboratorioNome: antigo?.nome },
        valorNovo: { laboratorioId: data.laboratorioId, laboratorioNome: novo?.nome },
      });
    }

    if (reprocessarManutencoes) {
      await db
        .update(manutencaoProgramada)
        .set({ status: "cancelada", atualizadoEm: new Date() })
        .where(
          and(
            eq(manutencaoProgramada.equipamentoId, id),
            eq(manutencaoProgramada.status, "programada"),
          ),
        );

      await db
        .update(manutencaoProgramada)
        .set({ status: "cancelada", atualizadoEm: new Date() })
        .where(
          and(
            eq(manutencaoProgramada.equipamentoId, id),
            eq(manutencaoProgramada.status, "pendente"),
          ),
        );

      try {
        await gerarManutencoesParaEquipamento(id);
      } catch {
        return NextResponse.json(
          {
            dados: updated,
            aviso:
              "Equipamento atualizado, mas falha ao gerar novas manutenções programadas. " +
              "Verifique se existem planos de manutenção configurados para a nova classificação/modelo.",
          },
          { status: 200 },
        );
      }

      await registrarAuditoria({
        usuarioId: session.user.id,
        operacao: "UPDATE",
        entidade: "manutencao_programada",
        registroId: id,
        valorAnterior: { acao: "cancelamento_manutencoes_por_troca_classificacao_modelo" },
        valorNovo: { acao: "regeracao_manutencoes_programadas" },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar equipamento." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem alterar equipamentos." },
        { status: 403 },
      );
    }

    const [existing] = await db.select().from(equipamento).where(eq(equipamento.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
    }

    if (existing.situacao === "descartado") {
      return NextResponse.json({ error: "Equipamento já está descartado." }, { status: 409 });
    }

    const [updated] = await db
      .update(equipamento)
      .set({ situacao: "descartado", atualizadoEm: new Date() })
      .where(eq(equipamento.id, id))
      .returning();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "equipamento",
      registroId: id,
      valorAnterior: { situacao: existing.situacao },
      valorNovo: { situacao: "descartado" },
    });

    return NextResponse.json({ message: "Equipamento descartado com sucesso.", dados: updated });
  } catch {
    return NextResponse.json({ error: "Erro ao descartar equipamento." }, { status: 500 });
  }
}

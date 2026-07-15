import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { manutencaoProgramada, equipamento, planoItem, laboratorio, unidade } from "@/db/schema";
import { getServerSession } from "@/lib/auth";

const selectManutencaoCompleta = {
  id: manutencaoProgramada.id,
  equipamentoId: manutencaoProgramada.equipamentoId,
  planoItemId: manutencaoProgramada.planoItemId,
  dataPrevista: manutencaoProgramada.dataPrevista,
  status: manutencaoProgramada.status,
  criadoEm: manutencaoProgramada.criadoEm,
  atualizadoEm: manutencaoProgramada.atualizadoEm,
  equipamentoPatrimonio: equipamento.patrimonio,
  equipamentoNumeroSerie: equipamento.numeroSerie,
  equipamentoSituacao: equipamento.situacao,
  planoItemNome: planoItem.nome,
  planoItemPeriodicidade: planoItem.periodicidade,
  planoItemCategoria: planoItem.categoria,
  laboratorioId: laboratorio.id,
  laboratorioNome: laboratorio.nome,
  unidadeId: unidade.id,
  unidadeNome: unidade.nome,
} as const;

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const equipamentoId = url.searchParams.get("equipamentoId");
    const laboratorioId = url.searchParams.get("laboratorioId");
    const dataInicio = url.searchParams.get("dataInicio");
    const dataFim = url.searchParams.get("dataFim");

    const conditions = [];
    if (status)
      conditions.push(
        eq(
          manutencaoProgramada.status,
          status as "programada" | "pendente" | "em_andamento" | "concluida" | "cancelada",
        ),
      );
    if (equipamentoId) conditions.push(eq(manutencaoProgramada.equipamentoId, equipamentoId));
    if (laboratorioId) conditions.push(eq(equipamento.laboratorioId, laboratorioId));
    if (dataInicio) conditions.push(gte(manutencaoProgramada.dataPrevista, new Date(dataInicio)));
    if (dataFim) conditions.push(lte(manutencaoProgramada.dataPrevista, new Date(dataFim)));

    let query = db
      .select(selectManutencaoCompleta)
      .from(manutencaoProgramada)
      .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
      .innerJoin(planoItem, eq(manutencaoProgramada.planoItemId, planoItem.id))
      .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
      .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const records = await query;
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar manutenções." }, { status: 500 });
  }
}

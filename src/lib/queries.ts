import { count, eq, gte, lte, sql, and, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  equipamento,
  manutencaoProgramada,
  historicoManutencao,
  classificacao,
  laboratorio,
  fabricante,
} from "@/db/schema";

export type DashboardKPI = {
  totalEquipamentos: number;
  pendentes: number;
  vencendoEm7Dias: number;
  desteMes: number;
  realizadasNoMes: number;
  criticos: number;
  tempoMedioAtraso: number;
};

export type OverdueAlert = {
  id: string;
  equipamentoId: string;
  patrimonio: string;
  nomeEquipamento: string;
  laboratorio: string;
  dataPrevista: Date;
  diasAtraso: number;
};

export type MonthlyCompleted = { mes: string; quantidade: number };

export type ClassificationDist = { nome: string; quantidade: number };

export type StatusDist = { status: string; quantidade: number };

export type LabBreakdown = { laboratorio: string; quantidade: number };

export type ManufacturerDist = { nome: string; quantidade: number };

export type MonthlyAvgDelay = { mes: string; mediaDias: number };

export type PendingItem = {
  id: string;
  equipamentoId: string;
  patrimonio: string;
  nomeEquipamento: string;
  laboratorio: string;
  classificacao: string;
  dataPrevista: Date;
  diasRestantes: number;
  diasAtraso: number;
};

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getDashboardKPI(): Promise<DashboardKPI> {
  const now = new Date();
  const fimSemana = new Date(now);
  fimSemana.setDate(fimSemana.getDate() + 7);
  const inicioMes = startOfMonth();

  const [totalResult] = await db
    .select({ total: count() })
    .from(equipamento)
    .where(eq(equipamento.situacao, "ativo"));

  const [pendentesResult] = await db
    .select({ total: count() })
    .from(manutencaoProgramada)
    .where(eq(manutencaoProgramada.status, "pendente"));

  const [vencendoResult] = await db
    .select({ total: count() })
    .from(manutencaoProgramada)
    .where(
      and(
        gte(manutencaoProgramada.dataPrevista, now),
        lte(manutencaoProgramada.dataPrevista, fimSemana),
        sql`${manutencaoProgramada.status} IN ('programada', 'pendente')`,
      ),
    );

  const [desteMesResult] = await db
    .select({ total: count() })
    .from(manutencaoProgramada)
    .where(gte(manutencaoProgramada.dataPrevista, inicioMes));

  const [realizadasResult] = await db
    .select({ total: count() })
    .from(historicoManutencao)
    .where(
      and(
        gte(historicoManutencao.dataExecutada, inicioMes),
        eq(historicoManutencao.status, "concluida"),
      ),
    );

  const [criticosResult] = await db
    .select({ total: count() })
    .from(manutencaoProgramada)
    .where(
      and(
        sql`${manutencaoProgramada.status} IN ('pendente')`,
        lte(manutencaoProgramada.dataPrevista, sql`NOW() - INTERVAL '7 days'`),
      ),
    );

  const [atrasoResult] = await db
    .select({
      media: sql<number>`COALESCE(AVG(${historicoManutencao.diasAtraso}), 0)`,
    })
    .from(historicoManutencao);

  return {
    totalEquipamentos: totalResult?.total ?? 0,
    pendentes: pendentesResult?.total ?? 0,
    vencendoEm7Dias: vencendoResult?.total ?? 0,
    desteMes: desteMesResult?.total ?? 0,
    realizadasNoMes: realizadasResult?.total ?? 0,
    criticos: criticosResult?.total ?? 0,
    tempoMedioAtraso: Number(atrasoResult?.media ?? 0),
  };
}

export async function getOverdueAlerts(): Promise<OverdueAlert[]> {
  const rows = await db
    .select({
      id: manutencaoProgramada.id,
      equipamentoId: manutencaoProgramada.equipamentoId,
      patrimonio: equipamento.patrimonio,
      nomeEquipamento: equipamento.patrimonio,
      laboratorio: laboratorio.nome,
      dataPrevista: manutencaoProgramada.dataPrevista,
      diasAtraso: sql<number>`EXTRACT(DAY FROM NOW() - ${manutencaoProgramada.dataPrevista})::int`,
    })
    .from(manutencaoProgramada)
    .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
    .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
    .where(
      and(
        eq(manutencaoProgramada.status, "pendente"),
        lte(manutencaoProgramada.dataPrevista, sql`NOW() - INTERVAL '1 day'`),
      ),
    )
    .orderBy(asc(manutencaoProgramada.dataPrevista));

  return rows.map((r) => ({
    ...r,
    nomeEquipamento: r.patrimonio,
    dataPrevista: new Date(r.dataPrevista),
  }));
}

export async function getMonthlyCompleted(): Promise<MonthlyCompleted[]> {
  const rows = await db
    .select({
      mes: sql<string>`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`,
      quantidade: count(),
    })
    .from(historicoManutencao)
    .where(
      and(
        eq(historicoManutencao.status, "concluida"),
        gte(historicoManutencao.dataExecutada, sql`NOW() - INTERVAL '12 months'`),
      ),
    )
    .groupBy(sql`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`);

  return rows.map((r) => ({ mes: r.mes, quantidade: r.quantidade }));
}

export async function getClassificationDist(): Promise<ClassificationDist[]> {
  const rows = await db
    .select({
      nome: classificacao.nome,
      quantidade: count(equipamento.id),
    })
    .from(equipamento)
    .innerJoin(classificacao, eq(equipamento.classificacaoId, classificacao.id))
    .where(eq(equipamento.situacao, "ativo"))
    .groupBy(classificacao.nome)
    .orderBy(desc(count(equipamento.id)));

  return rows.map((r) => ({ nome: r.nome, quantidade: r.quantidade }));
}

export async function getStatusDist(): Promise<StatusDist[]> {
  const rows = await db
    .select({
      status: manutencaoProgramada.status,
      quantidade: count(),
    })
    .from(manutencaoProgramada)
    .groupBy(manutencaoProgramada.status);

  return rows.map((r) => ({
    status: r.status,
    quantidade: r.quantidade,
  }));
}

export async function getLabBreakdown(): Promise<LabBreakdown[]> {
  const rows = await db
    .select({
      laboratorio: laboratorio.nome,
      quantidade: count(manutencaoProgramada.id),
    })
    .from(manutencaoProgramada)
    .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
    .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
    .groupBy(laboratorio.nome)
    .orderBy(desc(count(manutencaoProgramada.id)));

  return rows.map((r) => ({
    laboratorio: r.laboratorio,
    quantidade: r.quantidade,
  }));
}

export async function getManufacturerDist(): Promise<ManufacturerDist[]> {
  const rows = await db
    .select({
      nome: fabricante.nome,
      quantidade: count(equipamento.id),
    })
    .from(equipamento)
    .innerJoin(fabricante, eq(equipamento.fabricanteId, fabricante.id))
    .where(eq(equipamento.situacao, "ativo"))
    .groupBy(fabricante.nome)
    .orderBy(desc(count(equipamento.id)));

  return rows.map((r) => ({ nome: r.nome, quantidade: r.quantidade }));
}

export async function getMonthlyAvgDelay(): Promise<MonthlyAvgDelay[]> {
  const rows = await db
    .select({
      mes: sql<string>`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`,
      mediaDias: sql<number>`COALESCE(AVG(${historicoManutencao.diasAtraso}), 0)`,
    })
    .from(historicoManutencao)
    .where(
      and(
        gte(historicoManutencao.dataExecutada, sql`NOW() - INTERVAL '12 months'`),
        eq(historicoManutencao.status, "concluida"),
      ),
    )
    .groupBy(sql`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${historicoManutencao.dataExecutada}, 'YYYY-MM')`);

  return rows.map((r) => ({
    mes: r.mes,
    mediaDias: Math.round(Number(r.mediaDias) * 10) / 10,
  }));
}

export async function getPendingItems(): Promise<PendingItem[]> {
  const rows = await db
    .select({
      id: manutencaoProgramada.id,
      equipamentoId: manutencaoProgramada.equipamentoId,
      patrimonio: equipamento.patrimonio,
      nomeEquipamento: equipamento.patrimonio,
      laboratorio: laboratorio.nome,
      classificacao: classificacao.nome,
      dataPrevista: manutencaoProgramada.dataPrevista,
      diasRestantes: sql<number>`EXTRACT(DAY FROM ${manutencaoProgramada.dataPrevista} - NOW())::int`,
      diasAtraso: sql<number>`GREATEST(EXTRACT(DAY FROM NOW() - ${manutencaoProgramada.dataPrevista})::int, 0)`,
    })
    .from(manutencaoProgramada)
    .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
    .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
    .innerJoin(classificacao, eq(equipamento.classificacaoId, classificacao.id))
    .where(sql`${manutencaoProgramada.status} IN ('programada', 'pendente')`)
    .orderBy(asc(manutencaoProgramada.dataPrevista));

  return rows.map((r) => ({
    ...r,
    nomeEquipamento: r.patrimonio,
    dataPrevista: new Date(r.dataPrevista),
  }));
}

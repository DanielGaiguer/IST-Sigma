import { NextResponse } from "next/server";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { manutencaoProgramada, equipamento, planoItem, laboratorio, unidade } from "@/db/schema";
import { getServerSession } from "@/lib/auth";

type ManutencaoRow = {
  id: string;
  equipamentoId: string;
  planoItemId: string;
  dataPrevista: Date;
  status: string;
  criadoEm: Date;
  equipamentoPatrimonio: string;
  equipamentoNumeroSerie: string;
  equipamentoSituacao: string;
  planoItemNome: string;
  planoItemPeriodicidade: string;
  planoItemCategoria: string;
  laboratorioNome: string;
  unidadeNome: string;
};

type EquipamentoGroup = {
  equipamentoId: string;
  patrimonio: string;
  numeroSerie: string;
  situacao: string;
  laboratorio: string;
  unidade: string;
  manutencoes: ManutencaoRow[];
};

type AgendaSection = {
  totalEquipamentos: number;
  totalManutencoes: number;
  equipamentos: EquipamentoGroup[];
};

function groupByEquipamento(items: ManutencaoRow[]): EquipamentoGroup[] {
  const map = new Map<string, EquipamentoGroup>();
  for (const m of items) {
    if (!map.has(m.equipamentoId)) {
      map.set(m.equipamentoId, {
        equipamentoId: m.equipamentoId,
        patrimonio: m.equipamentoPatrimonio,
        numeroSerie: m.equipamentoNumeroSerie,
        situacao: m.equipamentoSituacao,
        laboratorio: m.laboratorioNome,
        unidade: m.unidadeNome,
        manutencoes: [],
      });
    }
    map.get(m.equipamentoId)!.manutencoes.push(m);
  }
  return Array.from(map.values());
}

function sectionStats(items: ManutencaoRow[]): AgendaSection {
  return {
    totalEquipamentos: new Set(items.map((m) => m.equipamentoId)).size,
    totalManutencoes: items.length,
    equipamentos: groupByEquipamento(items),
  };
}

/**
 * GET /api/manutencoes/agenda-hoje
 *
 * Retorna manutenções em 3 categorias:
 * - Atrasadas: status pendente com dataPrevista < hoje
 * - Hoje: dataPrevista igual à data atual
 * - Próximos 7 dias: programadas para os próximos 7 dias
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const now = new Date();
    const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fimDia = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const fimProximo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8);

    const manutencoes = await db
      .select({
        id: manutencaoProgramada.id,
        equipamentoId: manutencaoProgramada.equipamentoId,
        planoItemId: manutencaoProgramada.planoItemId,
        dataPrevista: manutencaoProgramada.dataPrevista,
        status: manutencaoProgramada.status,
        criadoEm: manutencaoProgramada.criadoEm,
        equipamentoPatrimonio: equipamento.patrimonio,
        equipamentoNumeroSerie: equipamento.numeroSerie,
        equipamentoSituacao: equipamento.situacao,
        planoItemNome: planoItem.nome,
        planoItemPeriodicidade: planoItem.periodicidade,
        planoItemCategoria: planoItem.categoria,
        laboratorioNome: laboratorio.nome,
        unidadeNome: unidade.nome,
      })
      .from(manutencaoProgramada)
      .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
      .innerJoin(planoItem, eq(manutencaoProgramada.planoItemId, planoItem.id))
      .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
      .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id))
      .where(
        or(
          and(
            eq(manutencaoProgramada.status, "pendente"),
            lt(manutencaoProgramada.dataPrevista, fimProximo),
          ),
          and(
            eq(manutencaoProgramada.status, "programada"),
            gte(manutencaoProgramada.dataPrevista, inicioDia),
            lt(manutencaoProgramada.dataPrevista, fimProximo),
          ),
        ),
      );

    const atrasadas: ManutencaoRow[] = [];
    const hoje: ManutencaoRow[] = [];
    const proximas: ManutencaoRow[] = [];

    for (const m of manutencoes) {
      const data = new Date(m.dataPrevista);
      if (data < inicioDia) {
        atrasadas.push(m);
      } else if (data >= inicioDia && data < fimDia) {
        hoje.push(m);
      } else if (data >= fimDia && data < fimProximo) {
        proximas.push(m);
      }
    }

    return NextResponse.json({
      data: inicioDia.toISOString().split("T")[0],
      atrasadas: sectionStats(atrasadas),
      hoje: sectionStats(hoje),
      proximosDias: sectionStats(proximas),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar agenda." }, { status: 500 });
  }
}

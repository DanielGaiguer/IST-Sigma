import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { historicoManutencao, equipamento, planoItem, usuario } from "@/db/schema";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const [record] = await db
      .select({
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
        planoItemNome: planoItem.nome,
        responsavelNome: usuario.nome,
      })
      .from(historicoManutencao)
      .innerJoin(equipamento, eq(historicoManutencao.equipamentoId, equipamento.id))
      .innerJoin(planoItem, eq(historicoManutencao.planoItemId, planoItem.id))
      .leftJoin(usuario, eq(historicoManutencao.responsavelId, usuario.id))
      .where(eq(historicoManutencao.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Registro de histórico não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar registro de histórico." }, { status: 500 });
  }
}

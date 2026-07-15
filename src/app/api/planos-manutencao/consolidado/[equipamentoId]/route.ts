import { NextResponse } from "next/server";
import { getPlanoConsolidado } from "@/server/maintenance-engine";
import { getServerSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ equipamentoId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { equipamentoId } = await params;

    const itens = await getPlanoConsolidado(equipamentoId);

    const base = itens.filter((i) => i.nivel === "base");
    const classificacao = itens.filter((i) => i.nivel === "classificacao");
    const modelo = itens.filter((i) => i.nivel === "modelo");

    return NextResponse.json({
      equipamentoId,
      totalItens: itens.length,
      porNivel: { base, classificacao, modelo },
      todosItens: itens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar plano consolidado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

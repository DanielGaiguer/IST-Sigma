import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { manutencaoProgramada } from "@/db/schema";
import { concluirManutencaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { concluirManutencao } from "@/server/maintenance-engine";
import { getServerSession } from "@/lib/auth";

/**
 * POST /api/manutencoes/[id]/concluir
 *
 * Conclui uma manutenção programada. A função concluirManutencao (maintenance-engine)
 * executa tudo em transação:
 *   1. Cria registro no historico_manutencao
 *   2. Atualiza manutencao_programada para "concluida"
 *   3. Cria nova manutencao_programada para o próximo ciclo
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = concluirManutencaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: manutencaoProgramada.id, status: manutencaoProgramada.status })
      .from(manutencaoProgramada)
      .where(eq(manutencaoProgramada.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Manutenção programada não encontrada." }, { status: 404 });
    }

    if (existing.status !== "programada" && existing.status !== "pendente") {
      return NextResponse.json(
        {
          error:
            `Manutenção está com status "${existing.status}". ` +
            `Apenas manutenções "programada" ou "pendente" podem ser concluídas.`,
        },
        { status: 409 },
      );
    }

    const result = await concluirManutencao(id, {
      dataExecutada: parsed.data.dataExecutada,
      responsavelId: parsed.data.responsavelId,
      observacoes: parsed.data.observacoes,
    });

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "manutencao_programada",
      registroId: id,
      valorAnterior: { status: existing.status },
      valorNovo: { status: "concluida", ...result },
    });

    return NextResponse.json({
      message: "Manutenção concluída com sucesso.",
      historico: result.historico,
      proxima: result.proxima,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao concluir manutenção.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

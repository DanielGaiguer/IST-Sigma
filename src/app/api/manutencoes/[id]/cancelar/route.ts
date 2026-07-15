import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { manutencaoProgramada } from "@/db/schema";
import { cancelarManutencaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

/**
 * POST /api/manutencoes/[id]/cancelar
 *
 * Cancela uma manutenção programada. Exige um motivo obrigatório,
 * que é registrado junto com a auditoria do cancelamento.
 *
 * Apenas manutenções com status "programada" ou "pendente" podem ser canceladas.
 * Manutenções "concluída" ou "cancelada" não podem ser alteradas.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = cancelarManutencaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
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
            `Apenas manutenções "programada" ou "pendente" podem ser canceladas.`,
        },
        { status: 409 },
      );
    }

    const [updated] = await db
      .update(manutencaoProgramada)
      .set({ status: "cancelada", atualizadoEm: new Date() })
      .where(eq(manutencaoProgramada.id, id))
      .returning();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "manutencao_programada",
      registroId: id,
      valorAnterior: { status: existing.status },
      valorNovo: { status: "cancelada", motivo: parsed.data.motivo },
    });

    return NextResponse.json({
      message: "Manutenção cancelada com sucesso.",
      dados: updated,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao cancelar manutenção." }, { status: 500 });
  }
}

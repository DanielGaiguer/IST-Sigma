import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fabricante, modelo } from "@/db/schema";
import { editarFabricanteSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [registro] = await db.select().from(fabricante).where(eq(fabricante.id, id));

    if (!registro) {
      return NextResponse.json({ error: "Fabricante não encontrado." }, { status: 404 });
    }

    return NextResponse.json(registro);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar fabricante." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem realizar esta operação." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;
    const body = await request.json();
    const parsed = editarFabricanteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(fabricante).where(eq(fabricante.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Fabricante não encontrado." }, { status: 404 });
    }

    const [updated] = await db
      .update(fabricante)
      .set({ ...parsed.data, atualizadoEm: new Date() })
      .where(eq(fabricante.id, id))
      .returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "fabricante",
        registroId: id,
        valorAnterior: existing,
        valorNovo: updated,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar fabricante." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem realizar esta operação." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;

    const [existing] = await db.select().from(fabricante).where(eq(fabricante.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Fabricante não encontrado." }, { status: 404 });
    }

    const [vinculado] = await db.select().from(modelo).where(eq(modelo.fabricanteId, id)).limit(1);

    if (vinculado) {
      return NextResponse.json(
        {
          error: "Não é possível excluir: existem modelos vinculados a este fabricante.",
        },
        { status: 409 },
      );
    }

    await db.delete(fabricante).where(eq(fabricante.id, id));

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "DELETE",
        entidade: "fabricante",
        registroId: id,
        valorAnterior: existing,
      });
    }

    return NextResponse.json({ message: "Fabricante excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir fabricante." }, { status: 500 });
  }
}

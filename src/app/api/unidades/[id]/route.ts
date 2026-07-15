import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { unidade, laboratorio } from "@/db/schema";
import { editarUnidadeSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [record] = await db.select().from(unidade).where(eq(unidade.id, id)).limit(1);

    if (!record) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar unidade." }, { status: 500 });
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
    const parsed = editarUnidadeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(unidade).where(eq(unidade.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
    }

    const [updated] = await db
      .update(unidade)
      .set({ ...parsed.data, atualizadoEm: new Date() })
      .where(eq(unidade.id, id))
      .returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "unidade",
        registroId: id,
        valorAnterior: existing,
        valorNovo: updated,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar unidade." }, { status: 500 });
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

    const [existing] = await db.select().from(unidade).where(eq(unidade.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
    }

    const [dependency] = await db
      .select()
      .from(laboratorio)
      .where(eq(laboratorio.unidadeId, id))
      .limit(1);

    if (dependency) {
      return NextResponse.json(
        { error: "Não é possível excluir: existem laboratórios vinculados a esta unidade." },
        { status: 409 },
      );
    }

    await db.delete(unidade).where(eq(unidade.id, id));

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "DELETE",
        entidade: "unidade",
        registroId: id,
        valorAnterior: existing,
      });
    }

    return NextResponse.json({ message: "Unidade excluída com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir unidade." }, { status: 500 });
  }
}

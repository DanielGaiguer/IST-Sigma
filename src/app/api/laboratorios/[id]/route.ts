import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { laboratorio, unidade, equipamento } from "@/db/schema";
import { editarLaboratorioSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [record] = await db.select().from(laboratorio).where(eq(laboratorio.id, id)).limit(1);

    if (!record) {
      return NextResponse.json({ error: "Laboratório não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar laboratório." }, { status: 500 });
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
    const parsed = editarLaboratorioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(laboratorio).where(eq(laboratorio.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Laboratório não encontrado." }, { status: 404 });
    }

    if (parsed.data.unidadeId) {
      const [unidadeRecord] = await db
        .select()
        .from(unidade)
        .where(eq(unidade.id, parsed.data.unidadeId))
        .limit(1);

      if (!unidadeRecord) {
        return NextResponse.json({ error: "Unidade não encontrada." }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(laboratorio)
      .set({ ...parsed.data, atualizadoEm: new Date() })
      .where(eq(laboratorio.id, id))
      .returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "laboratorio",
        registroId: id,
        valorAnterior: existing,
        valorNovo: updated,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar laboratório." }, { status: 500 });
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

    const [existing] = await db.select().from(laboratorio).where(eq(laboratorio.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Laboratório não encontrado." }, { status: 404 });
    }

    const [dependency] = await db
      .select()
      .from(equipamento)
      .where(eq(equipamento.laboratorioId, id))
      .limit(1);

    if (dependency) {
      return NextResponse.json(
        {
          error: "Não é possível excluir: existem equipamentos vinculados a este laboratório.",
        },
        { status: 409 },
      );
    }

    await db.delete(laboratorio).where(eq(laboratorio.id, id));

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "DELETE",
        entidade: "laboratorio",
        registroId: id,
        valorAnterior: existing,
      });
    }

    return NextResponse.json({ message: "Laboratório excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir laboratório." }, { status: 500 });
  }
}

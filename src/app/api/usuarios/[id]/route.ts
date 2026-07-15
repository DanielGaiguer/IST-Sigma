import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Somente administradores." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const [record] = await db
      .select({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        criadoEm: usuario.criadoEm,
        atualizadoEm: usuario.atualizadoEm,
      })
      .from(usuario)
      .where(eq(usuario.id, id));

    if (!record) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar usuário." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Somente administradores." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { nome, email, senha, perfil } = body;

    const [existing] = await db.select().from(usuario).where(eq(usuario.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { atualizadoEm: new Date() };

    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim().length === 0) {
        return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
      }
      updateData.nome = nome.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== existing.email) {
        const [emailExists] = await db
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.email, normalizedEmail));
        if (emailExists) {
          return NextResponse.json(
            { error: "Já existe um usuário com este e-mail." },
            { status: 409 },
          );
        }
      }
      updateData.email = normalizedEmail;
    }

    if (senha !== undefined) {
      if (typeof senha !== "string" || senha.length < 6) {
        return NextResponse.json(
          { error: "Senha deve ter no mínimo 6 caracteres." },
          { status: 400 },
        );
      }
      updateData.senhaHash = await bcrypt.hash(senha, 10);
    }

    if (perfil !== undefined) {
      if (!["admin", "tecnico"].includes(perfil)) {
        return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
      }
      updateData.perfil = perfil;
    }

    const [updated] = await db
      .update(usuario)
      .set(updateData)
      .where(eq(usuario.id, id))
      .returning();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "usuario",
      registroId: id,
      valorAnterior: { nome: existing.nome, email: existing.email, perfil: existing.perfil },
      valorNovo: { nome: updated.nome, email: updated.email, perfil: updated.perfil },
    });

    return NextResponse.json({
      id: updated.id,
      nome: updated.nome,
      email: updated.email,
      perfil: updated.perfil,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Somente administradores." },
        { status: 403 },
      );
    }

    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Não é possível excluir seu próprio usuário." },
        { status: 400 },
      );
    }

    const [existing] = await db.select().from(usuario).where(eq(usuario.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    await db.delete(usuario).where(eq(usuario.id, id));

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "DELETE",
      entidade: "usuario",
      registroId: id,
      valorAnterior: { nome: existing.nome, email: existing.email, perfil: existing.perfil },
    });

    return NextResponse.json({ message: "Usuário excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir usuário." }, { status: 500 });
  }
}

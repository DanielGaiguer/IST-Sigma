import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
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

    const records = await db
      .select({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        criadoEm: usuario.criadoEm,
        atualizadoEm: usuario.atualizadoEm,
      })
      .from(usuario);

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { nome, email, senha, perfil } = body;

    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }
    if (!senha || typeof senha !== "string" || senha.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres." },
        { status: 400 },
      );
    }
    if (perfil && !["admin", "tecnico"].includes(perfil)) {
      return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, email.trim().toLowerCase()));

    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [created] = await db
      .insert(usuario)
      .values({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senhaHash,
        perfil: perfil ?? "tecnico",
      })
      .returning();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "INSERT",
      entidade: "usuario",
      registroId: created.id,
      valorNovo: { nome: created.nome, email: created.email, perfil: created.perfil },
    });

    return NextResponse.json(
      { id: created.id, nome: created.nome, email: created.email, perfil: created.perfil },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }
}

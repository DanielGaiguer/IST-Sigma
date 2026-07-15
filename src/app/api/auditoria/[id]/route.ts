import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, usuario } from "@/db/schema";
import { getServerSession } from "@/lib/auth";

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
        id: auditoria.id,
        usuarioId: auditoria.usuarioId,
        dataHora: auditoria.dataHora,
        operacao: auditoria.operacao,
        entidade: auditoria.entidade,
        registroId: auditoria.registroId,
        valorAnterior: auditoria.valorAnterior,
        valorNovo: auditoria.valorNovo,
        usuarioNome: usuario.nome,
      })
      .from(auditoria)
      .innerJoin(usuario, eq(auditoria.usuarioId, usuario.id))
      .where(eq(auditoria.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Registro de auditoria não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar registro de auditoria." }, { status: 500 });
  }
}

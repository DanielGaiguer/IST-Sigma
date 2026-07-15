import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, usuario } from "@/db/schema";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const usuarioId = url.searchParams.get("usuarioId");
    const entidade = url.searchParams.get("entidade");
    const dataInicio = url.searchParams.get("dataInicio");
    const dataFim = url.searchParams.get("dataFim");

    const conditions = [];
    if (usuarioId) conditions.push(eq(auditoria.usuarioId, usuarioId));
    if (entidade) conditions.push(eq(auditoria.entidade, entidade));
    if (dataInicio) conditions.push(gte(auditoria.dataHora, new Date(dataInicio)));
    if (dataFim) conditions.push(lte(auditoria.dataHora, new Date(dataFim + "T23:59:59")));

    const baseQuery = db
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
      .innerJoin(usuario, eq(auditoria.usuarioId, usuario.id));

    const records = conditions.length ? await baseQuery.where(and(...conditions)) : await baseQuery;

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar registros de auditoria." }, { status: 500 });
  }
}

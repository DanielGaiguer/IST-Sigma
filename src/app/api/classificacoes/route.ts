import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classificacao, tipoEquipamento } from "@/db/schema";
import { criarClassificacaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoEquipamentoId = searchParams.get("tipoEquipamentoId");

    const conditions = [];
    if (tipoEquipamentoId) {
      conditions.push(eq(classificacao.tipoEquipamentoId, tipoEquipamentoId));
    }

    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(classificacao)
            .where(and(...conditions))
        : await db.select().from(classificacao);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar classificações." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem realizar esta operação." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;
    const body = await request.json();
    const parsed = criarClassificacaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingTipo] = await db
      .select()
      .from(tipoEquipamento)
      .where(eq(tipoEquipamento.id, parsed.data.tipoEquipamentoId))
      .limit(1);

    if (!existingTipo) {
      return NextResponse.json({ error: "Tipo de equipamento não encontrado." }, { status: 400 });
    }

    const [created] = await db.insert(classificacao).values(parsed.data).returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "INSERT",
        entidade: "classificacao",
        registroId: created.id,
        valorNovo: created,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar classificação." }, { status: 500 });
  }
}

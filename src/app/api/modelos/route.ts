import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { modelo, fabricante, classificacao } from "@/db/schema";
import { criarModeloSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fabricanteId = searchParams.get("fabricanteId");
    const classificacaoId = searchParams.get("classificacaoId");

    const conditions = [];
    if (fabricanteId) {
      conditions.push(eq(modelo.fabricanteId, fabricanteId));
    }
    if (classificacaoId) {
      conditions.push(eq(modelo.classificacaoId, classificacaoId));
    }

    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(modelo)
            .where(and(...conditions))
        : await db.select().from(modelo);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar modelos." }, { status: 500 });
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
    const parsed = criarModeloSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existingFabricante] = await db
      .select()
      .from(fabricante)
      .where(eq(fabricante.id, parsed.data.fabricanteId))
      .limit(1);

    if (!existingFabricante) {
      return NextResponse.json({ error: "Fabricante não encontrado." }, { status: 400 });
    }

    const [existingClassificacao] = await db
      .select()
      .from(classificacao)
      .where(eq(classificacao.id, parsed.data.classificacaoId))
      .limit(1);

    if (!existingClassificacao) {
      return NextResponse.json({ error: "Classificação não encontrada." }, { status: 400 });
    }

    const [created] = await db.insert(modelo).values(parsed.data).returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "INSERT",
        entidade: "modelo",
        registroId: created.id,
        valorNovo: created,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar modelo." }, { status: 500 });
  }
}

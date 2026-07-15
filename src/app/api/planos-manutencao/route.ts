import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { planoManutencao, classificacao, modelo } from "@/db/schema";
import { criarPlanoManutencaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const nivel = url.searchParams.get("nivel");
    const classificacaoId = url.searchParams.get("classificacaoId");
    const modeloId = url.searchParams.get("modeloId");

    const conditions = [];
    if (nivel)
      conditions.push(eq(planoManutencao.nivel, nivel as "base" | "classificacao" | "modelo"));
    if (classificacaoId) conditions.push(eq(planoManutencao.classificacaoId, classificacaoId));
    if (modeloId) conditions.push(eq(planoManutencao.modeloId, modeloId));

    let query = db
      .select({
        id: planoManutencao.id,
        nome: planoManutencao.nome,
        nivel: planoManutencao.nivel,
        classificacaoId: planoManutencao.classificacaoId,
        modeloId: planoManutencao.modeloId,
        criadoEm: planoManutencao.criadoEm,
        atualizadoEm: planoManutencao.atualizadoEm,
        classificacaoNome: classificacao.nome,
        modeloNome: modelo.nome,
      })
      .from(planoManutencao)
      .leftJoin(classificacao, eq(planoManutencao.classificacaoId, classificacao.id))
      .leftJoin(modelo, eq(planoManutencao.modeloId, modelo.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const records = await query;
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar planos de manutenção." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem gerenciar planos de manutenção." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;
    const body = await request.json();
    const parsed = criarPlanoManutencaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    if (data.nivel === "base" && (data.classificacaoId || data.modeloId)) {
      return NextResponse.json(
        { error: "Nível 'base' não deve ter classificação ou modelo vinculados." },
        { status: 400 },
      );
    }
    if (data.nivel === "classificacao" && (!data.classificacaoId || data.modeloId)) {
      return NextResponse.json(
        { error: "Nível 'classificação' requer classificacaoId sem modeloId." },
        { status: 400 },
      );
    }
    if (data.nivel === "modelo" && (!data.classificacaoId || !data.modeloId)) {
      return NextResponse.json(
        { error: "Nível 'modelo' requer classificacaoId e modeloId." },
        { status: 400 },
      );
    }

    if (data.nivel === "classificacao" && data.classificacaoId) {
      const [record] = await db
        .select({ id: classificacao.id })
        .from(classificacao)
        .where(eq(classificacao.id, data.classificacaoId))
        .limit(1);
      if (!record) {
        return NextResponse.json({ error: "Classificação não encontrada." }, { status: 400 });
      }
    }

    if (data.nivel === "modelo") {
      if (data.classificacaoId) {
        const [record] = await db
          .select({ id: classificacao.id })
          .from(classificacao)
          .where(eq(classificacao.id, data.classificacaoId))
          .limit(1);
        if (!record) {
          return NextResponse.json({ error: "Classificação não encontrada." }, { status: 400 });
        }
      }
      if (data.modeloId) {
        const [record] = await db
          .select({ id: modelo.id })
          .from(modelo)
          .where(eq(modelo.id, data.modeloId))
          .limit(1);
        if (!record) {
          return NextResponse.json({ error: "Modelo não encontrado." }, { status: 400 });
        }
      }
    }

    const [created] = await db
      .insert(planoManutencao)
      .values({
        nome: data.nome,
        nivel: data.nivel,
        classificacaoId: data.classificacaoId ?? null,
        modeloId: data.modeloId ?? null,
      })
      .returning();

    await registrarAuditoria({
      usuarioId,
      operacao: "INSERT",
      entidade: "plano_manutencao",
      registroId: created.id,
      valorNovo: created,
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar plano de manutenção." }, { status: 500 });
  }
}

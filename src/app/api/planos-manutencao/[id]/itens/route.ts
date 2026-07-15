import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { planoItem, planoManutencao } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";

/**
 * Schema para criação de PlanoItem via rota aninhada.
 * O planoManutencaoId vem da URL, não do body.
 */
const criarPlanoItemAninhadoSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  descricao: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres.")
    .nullable()
    .optional(),
  periodicidade: z.enum([
    "diario",
    "semanal",
    "quinzenal",
    "mensal",
    "trimestral",
    "semestral",
    "anual",
  ]),
  categoria: z
    .string()
    .min(1, "Categoria é obrigatória.")
    .max(100, "Categoria deve ter no máximo 100 caracteres."),
  status: z.enum(["ativo", "inativo"]).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;

    const [plano] = await db
      .select({ id: planoManutencao.id })
      .from(planoManutencao)
      .where(eq(planoManutencao.id, id))
      .limit(1);

    if (!plano) {
      return NextResponse.json({ error: "Plano de manutenção não encontrado." }, { status: 404 });
    }

    const itens = await db.select().from(planoItem).where(eq(planoItem.planoManutencaoId, id));

    return NextResponse.json(itens);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar itens do plano." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const parsed = criarPlanoItemAninhadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [plano] = await db
      .select({ id: planoManutencao.id })
      .from(planoManutencao)
      .where(eq(planoManutencao.id, id))
      .limit(1);

    if (!plano) {
      return NextResponse.json({ error: "Plano de manutenção não encontrado." }, { status: 404 });
    }

    const data = parsed.data;

    const [created] = await db
      .insert(planoItem)
      .values({
        planoManutencaoId: id,
        nome: data.nome,
        descricao: data.descricao ?? null,
        periodicidade: data.periodicidade,
        categoria: data.categoria,
        status: data.status ?? "ativo",
      })
      .returning();

    await registrarAuditoria({
      usuarioId,
      operacao: "INSERT",
      entidade: "plano_item",
      registroId: created.id,
      valorNovo: created,
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar item do plano." }, { status: 500 });
  }
}

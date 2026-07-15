import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { laboratorio, unidade } from "@/db/schema";
import { criarLaboratorioSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const unidadeId = url.searchParams.get("unidadeId");

    const query = db.select().from(laboratorio);
    const records = unidadeId
      ? await query.where(eq(laboratorio.unidadeId, unidadeId))
      : await query;

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar laboratórios." }, { status: 500 });
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
    const parsed = criarLaboratorioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [unidadeRecord] = await db
      .select()
      .from(unidade)
      .where(eq(unidade.id, parsed.data.unidadeId))
      .limit(1);

    if (!unidadeRecord) {
      return NextResponse.json({ error: "Unidade não encontrada." }, { status: 400 });
    }

    const [created] = await db.insert(laboratorio).values(parsed.data).returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "INSERT",
        entidade: "laboratorio",
        registroId: created.id,
        valorNovo: created,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar laboratório." }, { status: 500 });
  }
}

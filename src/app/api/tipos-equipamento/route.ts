import { NextResponse } from "next/server";
import { db } from "@/db";
import { tipoEquipamento } from "@/db/schema";
import { criarTipoEquipamentoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  try {
    const registros = await db.select().from(tipoEquipamento);
    return NextResponse.json(registros);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar tipos de equipamento." }, { status: 500 });
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
    const parsed = criarTipoEquipamentoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [created] = await db.insert(tipoEquipamento).values(parsed.data).returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "INSERT",
        entidade: "tipo_equipamento",
        registroId: created.id,
        valorNovo: created,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar tipo de equipamento." }, { status: 500 });
  }
}

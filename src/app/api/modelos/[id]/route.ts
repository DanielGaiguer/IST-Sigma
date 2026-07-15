import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modelo, fabricante, classificacao, equipamento, planoManutencao } from "@/db/schema";
import { editarModeloSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [result] = await db.select().from(modelo).where(eq(modelo.id, id)).limit(1);

    if (!result) {
      return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar modelo." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const parsed = editarModeloSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db.select().from(modelo).where(eq(modelo.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
    }

    if (parsed.data.fabricanteId) {
      const [existingFabricante] = await db
        .select()
        .from(fabricante)
        .where(eq(fabricante.id, parsed.data.fabricanteId))
        .limit(1);

      if (!existingFabricante) {
        return NextResponse.json({ error: "Fabricante não encontrado." }, { status: 400 });
      }
    }

    if (parsed.data.classificacaoId) {
      const [existingClassificacao] = await db
        .select()
        .from(classificacao)
        .where(eq(classificacao.id, parsed.data.classificacaoId))
        .limit(1);

      if (!existingClassificacao) {
        return NextResponse.json({ error: "Classificação não encontrada." }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(modelo)
      .set({ ...parsed.data, atualizadoEm: new Date() })
      .where(eq(modelo.id, id))
      .returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "modelo",
        registroId: id,
        valorAnterior: existing,
        valorNovo: updated,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar modelo." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const [existingEquipamento] = await db
      .select()
      .from(equipamento)
      .where(eq(equipamento.modeloId, id))
      .limit(1);

    if (existingEquipamento) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem equipamentos ou planos de manutenção vinculados a este modelo.",
        },
        { status: 409 },
      );
    }

    const [existingPlano] = await db
      .select()
      .from(planoManutencao)
      .where(eq(planoManutencao.modeloId, id))
      .limit(1);

    if (existingPlano) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem equipamentos ou planos de manutenção vinculados a este modelo.",
        },
        { status: 409 },
      );
    }

    const [existing] = await db.select().from(modelo).where(eq(modelo.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
    }

    await db.delete(modelo).where(eq(modelo.id, id));

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "DELETE",
        entidade: "modelo",
        registroId: id,
        valorAnterior: existing,
      });
    }

    return NextResponse.json({ message: "Modelo excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir modelo." }, { status: 500 });
  }
}

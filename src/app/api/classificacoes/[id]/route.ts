import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classificacao, tipoEquipamento, modelo, equipamento, planoManutencao } from "@/db/schema";
import { editarClassificacaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [result] = await db.select().from(classificacao).where(eq(classificacao.id, id)).limit(1);

    if (!result) {
      return NextResponse.json({ error: "Classificação não encontrada." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar classificação." }, { status: 500 });
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
    const parsed = editarClassificacaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(classificacao)
      .where(eq(classificacao.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Classificação não encontrada." }, { status: 404 });
    }

    if (parsed.data.tipoEquipamentoId) {
      const [existingTipo] = await db
        .select()
        .from(tipoEquipamento)
        .where(eq(tipoEquipamento.id, parsed.data.tipoEquipamentoId))
        .limit(1);

      if (!existingTipo) {
        return NextResponse.json({ error: "Tipo de equipamento não encontrado." }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(classificacao)
      .set({ ...parsed.data, atualizadoEm: new Date() })
      .where(eq(classificacao.id, id))
      .returning();

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "classificacao",
        registroId: id,
        valorAnterior: existing,
        valorNovo: updated,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar classificação." }, { status: 500 });
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

    // Verifica dependências em 3 tabelas.
    const [existingModelo] = await db
      .select()
      .from(modelo)
      .where(eq(modelo.classificacaoId, id))
      .limit(1);

    if (existingModelo) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem registros vinculados a esta classificação (modelos, equipamentos ou planos de manutenção).",
        },
        { status: 409 },
      );
    }

    const [existingEquipamento] = await db
      .select()
      .from(equipamento)
      .where(eq(equipamento.classificacaoId, id))
      .limit(1);

    if (existingEquipamento) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem registros vinculados a esta classificação (modelos, equipamentos ou planos de manutenção).",
        },
        { status: 409 },
      );
    }

    const [existingPlano] = await db
      .select()
      .from(planoManutencao)
      .where(eq(planoManutencao.classificacaoId, id))
      .limit(1);

    if (existingPlano) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem registros vinculados a esta classificação (modelos, equipamentos ou planos de manutenção).",
        },
        { status: 409 },
      );
    }

    const [existing] = await db
      .select()
      .from(classificacao)
      .where(eq(classificacao.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Classificação não encontrada." }, { status: 404 });
    }

    await db.delete(classificacao).where(eq(classificacao.id, id));

    if (usuarioId) {
      await registrarAuditoria({
        usuarioId,
        operacao: "DELETE",
        entidade: "classificacao",
        registroId: id,
        valorAnterior: existing,
      });
    }

    return NextResponse.json({ message: "Classificação excluída com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir classificação." }, { status: 500 });
  }
}

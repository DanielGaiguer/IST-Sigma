import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  planoManutencao,
  planoItem,
  classificacao,
  modelo,
  manutencaoProgramada,
} from "@/db/schema";
import { editarPlanoManutencaoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const [record] = await db
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
      .leftJoin(modelo, eq(planoManutencao.modeloId, modelo.id))
      .where(eq(planoManutencao.id, id))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Plano de manutenção não encontrado." }, { status: 404 });
    }

    const itens = await db.select().from(planoItem).where(eq(planoItem.planoManutencaoId, id));

    return NextResponse.json({ ...record, itens });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar plano de manutenção." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem gerenciar planos de manutenção." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;
    const body = await request.json();
    const parsed = editarPlanoManutencaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(planoManutencao)
      .where(eq(planoManutencao.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Plano de manutenção não encontrado." }, { status: 404 });
    }

    const data = parsed.data;

    const nivelFinal = data.nivel ?? existing.nivel;
    const classificacaoIdFinal =
      data.classificacaoId !== undefined ? data.classificacaoId : existing.classificacaoId;
    const modeloIdFinal = data.modeloId !== undefined ? data.modeloId : existing.modeloId;

    if (nivelFinal === "base" && (classificacaoIdFinal || modeloIdFinal)) {
      return NextResponse.json(
        { error: "Nível 'base' não deve ter classificação ou modelo vinculados." },
        { status: 400 },
      );
    }
    if (nivelFinal === "classificacao" && (!classificacaoIdFinal || modeloIdFinal)) {
      return NextResponse.json(
        { error: "Nível 'classificação' requer classificaçãoId sem modeloId." },
        { status: 400 },
      );
    }
    if (nivelFinal === "modelo" && (!classificacaoIdFinal || !modeloIdFinal)) {
      return NextResponse.json(
        { error: "Nível 'modelo' requer classificacaoId e modeloId." },
        { status: 400 },
      );
    }

    if (data.classificacaoId && data.classificacaoId !== existing.classificacaoId) {
      const [record] = await db
        .select({ id: classificacao.id })
        .from(classificacao)
        .where(eq(classificacao.id, data.classificacaoId))
        .limit(1);
      if (!record) {
        return NextResponse.json({ error: "Classificação não encontrada." }, { status: 400 });
      }
    }

    if (data.modeloId && data.modeloId !== existing.modeloId) {
      const [record] = await db
        .select({ id: modelo.id })
        .from(modelo)
        .where(eq(modelo.id, data.modeloId))
        .limit(1);
      if (!record) {
        return NextResponse.json({ error: "Modelo não encontrado." }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(planoManutencao)
      .set({ ...data, atualizadoEm: new Date() })
      .where(eq(planoManutencao.id, id))
      .returning();

    await registrarAuditoria({
      usuarioId,
      operacao: "UPDATE",
      entidade: "plano_manutencao",
      registroId: id,
      valorAnterior: existing,
      valorNovo: updated,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar plano de manutenção." }, { status: 500 });
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
        { error: "Acesso negado. Apenas administradores podem gerenciar planos de manutenção." },
        { status: 403 },
      );
    }
    const usuarioId = session.user.id;

    const [existing] = await db
      .select()
      .from(planoManutencao)
      .where(eq(planoManutencao.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Plano de manutenção não encontrado." }, { status: 404 });
    }

    const itens = await db
      .select({ id: planoItem.id })
      .from(planoItem)
      .where(eq(planoItem.planoManutencaoId, id));
    const itemIds = itens.map((i) => i.id);

    if (itemIds.length > 0) {
      const [dependency] = await db
        .select({ id: manutencaoProgramada.id })
        .from(manutencaoProgramada)
        .where(and(...itemIds.map((itemId) => eq(manutencaoProgramada.planoItemId, itemId))))
        .limit(1);

      if (dependency) {
        return NextResponse.json(
          {
            error:
              "Não é possível excluir: existem manutenções programadas " +
              "para itens deste plano. Cancele ou conclua-as antes de excluir.",
          },
          { status: 409 },
        );
      }
    }

    await db.delete(planoManutencao).where(eq(planoManutencao.id, id));

    await registrarAuditoria({
      usuarioId,
      operacao: "DELETE",
      entidade: "plano_manutencao",
      registroId: id,
      valorAnterior: existing,
    });

    return NextResponse.json({ message: "Plano de manutenção excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir plano de manutenção." }, { status: 500 });
  }
}

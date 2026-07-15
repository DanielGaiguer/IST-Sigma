import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { planoItem, planoManutencao, manutencaoProgramada, historicoManutencao } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";

const editarPlanoItemAninhadoSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres.")
    .optional(),
  descricao: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres.")
    .nullable()
    .optional(),
  periodicidade: z
    .enum(["diario", "semanal", "quinzenal", "mensal", "trimestral", "semestral", "anual"])
    .optional(),
  categoria: z
    .string()
    .min(1, "Categoria é obrigatória.")
    .max(100, "Categoria deve ter no máximo 100 caracteres.")
    .optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGRA DE PROTEÇÃO DO HISTÓRICO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * O histórico de manutenções (tabela historico_manutencao) NUNCA é alterado
 * retroativamente. Uma vez que uma manutenção foi registrada no histórico,
 * seus dados (dataExecutada, responsavel, observacoes, diasAtraso) ficam
 * permanentes para fins de rastreabilidade e auditoria.
 *
 * Quando um PlanoItem é DESATIVADO (status: "ativo" → "inativo"):
 *   → Manutenções JÁ CONCLUÍDAS ou CANCELADAS no histórico permanecem
 *     inalteradas — são registros históricos imutáveis.
 *   → Manutenções PROGRAMADAS ou PENDENTES que referenciam este item
 *     precisam ser explicitamente CANCELADAS antes da desativação, pois
 *     elas representam compromissos futuros que não podem existir para
 *     um item inativo. O sistema BLOQUEIA a desativação enquanto houver
 *     manutenções programadas/pendentes ativas para este item.
 *
 * Quando a PERIODICIDADE de um PlanoItem é ALTERADA:
 *   → O histórico passado não é afetado — manutenções já executadas
 *     mantêm suas datas originais.
 *   → As manutenções FUTURAS (programadas/pendentes) terão sua
 *     dataPrevista recalculada com base na nova periodicidade quando
 *     a manutenção for concluída (via calcularProximaData no
 *     maintenance-engine). A alteração é permitida sem bloqueio,
 *     mas o sistema DOCUMENTA em auditoria que a periodicidade mudou,
 *     para que o frontend possa exibir um aviso ao usuário.
 *
 * Quando um PlanoItem é EXCLUÍDO:
 *   → A exclusão é bloqueada se existirem manutenções programadas
 *     (status programada/pendente) referenciando este item.
 *   → Manutenções já concluídas no histórico possuem onDelete: "restrict"
 *     na FK, então a exclusão física seria bloqueada pelo banco também.
 *     A rota verifica isso proativamente para dar uma mensagem amigável.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id, itemId } = await params;

    const [record] = await db
      .select({
        id: planoItem.id,
        planoManutencaoId: planoItem.planoManutencaoId,
        nome: planoItem.nome,
        descricao: planoItem.descricao,
        periodicidade: planoItem.periodicidade,
        categoria: planoItem.categoria,
        status: planoItem.status,
        criadoEm: planoItem.criadoEm,
        atualizadoEm: planoItem.atualizadoEm,
        planoManutencaoNome: planoManutencao.nome,
      })
      .from(planoItem)
      .innerJoin(planoManutencao, eq(planoItem.planoManutencaoId, planoManutencao.id))
      .where(and(eq(planoItem.id, itemId), eq(planoItem.planoManutencaoId, id)))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Item do plano não encontrado." }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar item do plano." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
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
    const parsed = editarPlanoItemAninhadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(planoItem)
      .where(and(eq(planoItem.id, itemId), eq(planoItem.planoManutencaoId, id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Item do plano não encontrado." }, { status: 404 });
    }

    const data = parsed.data;

    const mudouStatus = data.status !== undefined && data.status !== existing.status;
    const mudouPeriodicidade =
      data.periodicidade !== undefined && data.periodicidade !== existing.periodicidade;

    if (mudouStatus && data.status === "inativo") {
      const [pendente] = await db
        .select({ id: manutencaoProgramada.id })
        .from(manutencaoProgramada)
        .where(
          and(
            eq(manutencaoProgramada.planoItemId, itemId),
            eq(manutencaoProgramada.status, "programada"),
          ),
        )
        .limit(1);

      if (pendente) {
        return NextResponse.json(
          {
            error:
              "Não é possível desativar: existem manutenções programadas " +
              "para este item. Cancele-as antes de desativar.",
          },
          { status: 409 },
        );
      }

      const [pendenteHistorico] = await db
        .select({ id: manutencaoProgramada.id })
        .from(manutencaoProgramada)
        .where(
          and(
            eq(manutencaoProgramada.planoItemId, itemId),
            eq(manutencaoProgramada.status, "pendente"),
          ),
        )
        .limit(1);

      if (pendenteHistorico) {
        return NextResponse.json(
          {
            error:
              "Não é possível desativar: existem manutenções pendentes " +
              "para este item. Cancele-as antes de desativar.",
          },
          { status: 409 },
        );
      }
    }

    if (mudouPeriodicidade) {
      const [pendente] = await db
        .select({ id: manutencaoProgramada.id })
        .from(manutencaoProgramada)
        .where(
          and(
            eq(manutencaoProgramada.planoItemId, itemId),
            eq(manutencaoProgramada.status, "programada"),
          ),
        )
        .limit(1);

      if (pendente) {
        return NextResponse.json(
          {
            error:
              "Não é possível alterar a periodicidade: existem manutenções " +
              "programadas que foram calculadas com a periodicidade atual. " +
              "Cancele as manutenções programadas antes de alterar.",
          },
          { status: 409 },
        );
      }
    }

    const [updated] = await db
      .update(planoItem)
      .set({ ...data, atualizadoEm: new Date() })
      .where(eq(planoItem.id, itemId))
      .returning();

    await registrarAuditoria({
      usuarioId,
      operacao: "UPDATE",
      entidade: "plano_item",
      registroId: itemId,
      valorAnterior: existing,
      valorNovo: updated,
    });

    if (mudouStatus) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "plano_item",
        registroId: itemId,
        valorAnterior: { status: existing.status },
        valorNovo: { status: data.status },
      });
    }

    if (mudouPeriodicidade) {
      await registrarAuditoria({
        usuarioId,
        operacao: "UPDATE",
        entidade: "plano_item",
        registroId: itemId,
        valorAnterior: { periodicidade: existing.periodicidade },
        valorNovo: { periodicidade: data.periodicidade },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar item do plano." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
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
      .from(planoItem)
      .where(and(eq(planoItem.id, itemId), eq(planoItem.planoManutencaoId, id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Item do plano não encontrado." }, { status: 404 });
    }

    const [pendente] = await db
      .select({ id: manutencaoProgramada.id })
      .from(manutencaoProgramada)
      .where(
        and(
          eq(manutencaoProgramada.planoItemId, itemId),
          eq(manutencaoProgramada.status, "programada"),
        ),
      )
      .limit(1);

    if (pendente) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem manutenções programadas " +
            "para este item. Cancele-as antes de excluir.",
        },
        { status: 409 },
      );
    }

    const [pendenteHist] = await db
      .select({ id: manutencaoProgramada.id })
      .from(manutencaoProgramada)
      .where(
        and(
          eq(manutencaoProgramada.planoItemId, itemId),
          eq(manutencaoProgramada.status, "pendente"),
        ),
      )
      .limit(1);

    if (pendenteHist) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: existem manutenções pendentes " +
            "para este item. Cancele-as antes de excluir.",
        },
        { status: 409 },
      );
    }

    const [historicoExistente] = await db
      .select({ id: historicoManutencao.id })
      .from(historicoManutencao)
      .where(eq(historicoManutencao.planoItemId, itemId))
      .limit(1);

    if (historicoExistente) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: este item possui registros no histórico " +
            "de manutenções. O histórico é imutável. Desative o item ao invés " +
            "de excluí-lo.",
        },
        { status: 409 },
      );
    }

    await db.delete(planoItem).where(eq(planoItem.id, itemId));

    await registrarAuditoria({
      usuarioId,
      operacao: "DELETE",
      entidade: "plano_item",
      registroId: itemId,
      valorAnterior: existing,
    });

    return NextResponse.json({ message: "Item do plano excluído com sucesso." });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir item do plano." }, { status: 500 });
  }
}

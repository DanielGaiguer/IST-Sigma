import { NextResponse } from "next/server";
import { atualizarStatusVencidas } from "@/server/maintenance-engine";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "@/lib/auth";

/**
 * POST /api/manutencoes/atualizar-vencidas
 *
 * Endpoint para atualizar manutenções vencidas (dataPrevista < hoje)
 * de status "programada" para "pendente".
 *
 * Pode ser chamado:
 *   - Manualmente por um botão no painel admin
 *   - Por um cron job externo (Vercel Cron, node-cron, etc.)
 *
 * A função atualizarStatusVencidas é idempotente — múltiplas chamadas
 * não causam efeitos colaterais.
 */
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem executar esta operação." },
        { status: 403 },
      );
    }

    const quantidade = await atualizarStatusVencidas();

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "UPDATE",
      entidade: "manutencao_programada",
      registroId: "lote",
      valorAnterior: { acao: "atualizar_vencidas", quantidadeAfetada: 0 },
      valorNovo: { acao: "atualizar_vencidas", quantidadeAfetada: quantidade },
    });

    return NextResponse.json({
      message:
        quantidade > 0
          ? `${quantidade} manutenção(ões) marcada(s) como pendente(s).`
          : "Nenhuma manutenção vencida encontrada.",
      quantidade,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar manutenções vencidas." }, { status: 500 });
  }
}

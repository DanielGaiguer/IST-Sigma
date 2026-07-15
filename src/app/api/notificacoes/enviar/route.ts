import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { enviarNotificacoes } from "@/server/notifications";

/**
 * POST /api/notificacoes/enviar
 *
 * Dispara o envio de notificações por e-mail para manutenções pendentes.
 *
 * Autenticação:
 *   - Requer sessão válida (usuário logado) — OU —
 *   - Header `x-vercel-cron: 1` para chamadas de cron job do Vercel.
 *
 * Fluxo:
 *   1. Valida autenticação (ou cron).
 *   2. Chama enviarNotificacoes() do módulo server/notifications.
 *   3. Retorna resumo do processo.
 */
export async function POST(request: Request) {
  // Verifica se é uma chamada de cron job do Vercel
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!isVercelCron) {
    // Para chamadas manuais, exige autenticação + perfil admin
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Somente administradores." },
        { status: 403 },
      );
    }
  }

  try {
    const resultado = await enviarNotificacoes();

    return NextResponse.json({
      ok: true,
      mensagem: `${resultado.emailsEnviados} e-mail(ns) enviado(s) com sucesso.`,
      detalhes: {
        totalPendencias: resultado.totalPendencias,
        emailsEnviados: resultado.emailsEnviados,
        laboratoriosEnvolvidos: resultado.laboratoriosEnvolvidos,
        destinatarios: resultado.destinatarios,
        enviadoEm: resultado.enviadoEm.toISOString(),
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { ok: false, error: `Falha ao enviar notificações: ${errMsg}` },
      { status: 500 },
    );
  }
}

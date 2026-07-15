/**
 * Notifications Server Module — Integração com Microsoft Graph API (Outlook).
 *
 * Este módulo é independente de rotas HTTP e pode ser chamado por:
 *   - API Routes (POST /api/notificacoes/enviar)
 *   - Cron jobs (Vercel Cron, node-cron, etc.)
 *   - Server Actions
 *
 * Regras de negócio:
 *   1. Notificação 7 dias antes do vencimento (janela de antecedência).
 *   2. Notificação no dia do vencimento.
 *   3. Reenvio periódico para manutenções pendentes/vencidas (a cada X dias, configurável).
 *   4. E-mails consolidados por laboratório (um e-mail por lab com todas as pendências).
 *
 * ─── INTEGRAÇÃO COM CRON JOB ─────────────────────────────────────────────────
 * Para configurar um cron job (ex: Vercel Cron), adicione ao vercel.json:
 *
 *   { "crons": [{ "path": "/api/notificacoes/enviar", "schedule": "0 8 * * *" }] }
 *
 * Isso chamará a rota todos os dias às 08:00 UTC.
 * A rota detecta se a chamada veio de um cron (via header `x-vercel-cron`)
 * e executa silenciosamente, retornando 200 sem necessidade de autenticação.
 *
 * Alternativamente, chame diretamente:
 *   import { enviarNotificacoes } from "@/server/notifications";
 *   const resultado = await enviarNotificacoes();
 */

import { and, eq, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  manutencaoProgramada,
  equipamento,
  laboratorio,
  unidade,
  planoItem,
  notificationLog,
  usuario,
} from "@/db/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PendenciaNotificavel {
  manutencaoId: string;
  equipamentoId: string;
  patrimonio: string;
  equipamentoNome: string;
  labId: string;
  labNome: string;
  unidadeNome: string;
  servico: string;
  periodicidade: string;
  dataPrevista: Date;
  diasRestantes: number;
  status: "proximo" | "vencido_hoje" | "atrasado";
}

export interface ResultadoNotificacao {
  totalPendencias: number;
  emailsEnviados: number;
  laboratoriosEnvolvidos: string[];
  destinatarios: string[];
  ErroEnvio: string | null;
  enviadoEm: Date;
}

// ─── Configuração ─────────────────────────────────────────────────────────────

const DIAS_ANTECEDENCIA = 7;
const INTERVALO_REENVIO_DIAS = 3;

/**
 * Retorna a configuração do Graph API a partir das variáveis de ambiente.
 * Lança erro se alguma variável estiver faltando.
 */
function getGraphConfig() {
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const senderEmail = process.env.MS_GRAPH_SENDER_EMAIL;

  if (!clientId || !clientSecret || !tenantId || !senderEmail) {
    throw new Error(
      "Variáveis de ambiente do Microsoft Graph não configuradas. " +
        "Defina MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID e MS_GRAPH_SENDER_EMAIL.",
    );
  }

  return { clientId, clientSecret, tenantId, senderEmail };
}

// ─── 1. Buscar pendências elegíveis ───────────────────────────────────────────

/**
 * Busca todas as manutenções programadas elegíveis para notificação.
 *
 * Critérios de elegibilidade:
 *   - Status: "programada" ou "pendente"
 *   - Janela de antecedência: dataPrevista ≤ hoje + DIAS_ANTECEDENCIA
 *   - Reenvio: para pendências já vencidas, verifica se já passou o intervalo
 *     desde o último envio bem-sucedido.
 */
export async function buscarPendenciasElegiveis(): Promise<PendenciaNotificavel[]> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteAntecedencia = new Date(hoje);
  limiteAntecedencia.setDate(limiteAntecedencia.getDate() + DIAS_ANTECEDENCIA);

  // Busca manutenções elegíveis: status programada/pendente com data ≤ hoje + 7 dias
  const manutencoes = await db
    .select({
      manutencaoId: manutencaoProgramada.id,
      equipamentoId: manutencaoProgramada.equipamentoId,
      patrimonio: equipamento.patrimonio,
      equipamentoNome: equipamento.patrimonio,
      labId: equipamento.laboratorioId,
      labNome: laboratorio.nome,
      unidadeNome: unidade.nome,
      servico: planoItem.nome,
      periodicidade: planoItem.periodicidade,
      dataPrevista: manutencaoProgramada.dataPrevista,
      status: manutencaoProgramada.status,
    })
    .from(manutencaoProgramada)
    .innerJoin(equipamento, eq(manutencaoProgramada.equipamentoId, equipamento.id))
    .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id))
    .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id))
    .innerJoin(planoItem, eq(manutencaoProgramada.planoItemId, planoItem.id))
    .where(
      and(
        inArray(manutencaoProgramada.status, ["programada", "pendente"]),
        lte(manutencaoProgramada.dataPrevista, limiteAntecedencia),
      ),
    );

  if (manutencoes.length === 0) return [];

  // Para cada manutenção, classifica o status e verifica reenvio
  const elegiveis: PendenciaNotificavel[] = [];

  for (const m of manutencoes) {
    const dataPrev = new Date(m.dataPrevista);
    dataPrev.setHours(0, 0, 0, 0);

    const diffMs = hoje.getTime() - dataPrev.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status: "proximo" | "vencido_hoje" | "atrasado";
    if (diasRestantes > 0) {
      status = "atrasado";
    } else if (diasRestantes === 0) {
      status = "vencido_hoje";
    } else {
      status = "proximo";
    }

    // Para atrasadas, verifica se já foi notificada recentemente
    if (status === "atrasado") {
      const [ultimoLog] = await db
        .select({ enviadoEm: notificationLog.enviadoEm })
        .from(notificationLog)
        .where(
          and(
            eq(notificationLog.statusEnvio, "sucesso"),
            sql`${notificationLog.destinatarios} LIKE ${"%" + m.patrimonio + "%"}`,
          ),
        )
        .orderBy(sql`${notificationLog.enviadoEm} DESC`)
        .limit(1);

      if (ultimoLog) {
        const diasDesdeUltimoEnvio = Math.ceil(
          (hoje.getTime() - new Date(ultimoLog.enviadoEm).getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diasDesdeUltimoEnvio < INTERVALO_REENVIO_DIAS) {
          continue; // Pula — já foi notificada há menos de X dias
        }
      }
    }

    elegiveis.push({
      manutencaoId: m.manutencaoId,
      equipamentoId: m.equipamentoId,
      patrimonio: m.patrimonio,
      equipamentoNome: m.equipamentoNome,
      labId: m.labId,
      labNome: m.labNome,
      unidadeNome: m.unidadeNome,
      servico: m.servico,
      periodicidade: m.periodicidade,
      dataPrevista: dataPrev,
      diasRestantes,
      status,
    });
  }

  return elegiveis;
}

// ─── 2. Montar corpo do e-mail ────────────────────────────────────────────────

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusLabel(s: "proximo" | "vencido_hoje" | "atrasado"): string {
  return { proximo: "A Vencer", vencido_hoje: "Vence Hoje", atrasado: "Atrasado" }[s];
}

function statusColor(s: "proximo" | "vencido_hoje" | "atrasado"): string {
  return { proximo: "#F59E0B", vencido_hoje: "#EF4444", atrasado: "#DC2626" }[s];
}

/**
 * Monta o HTML do e-mail consolidado para um laboratório.
 * Formato: tabela simples com todas as pendências do lab.
 */
function montarCorpoEmail(
  labNome: string,
  unidadeNome: string,
  pendencias: PendenciaNotificavel[],
): string {
  const totalAtrasadas = pendencias.filter((p) => p.status === "atrasado").length;
  const totalVencidas = pendencias.filter((p) => p.status === "vencido_hoje").length;
  const totalProximas = pendencias.filter((p) => p.status === "proximo").length;

  const headerBg = totalAtrasadas > 0 ? "#FEE2E2" : totalVencidas > 0 ? "#FEF3C7" : "#F0FDF4";
  const headerBorder = totalAtrasadas > 0 ? "#DC2626" : totalVencidas > 0 ? "#F59E0B" : "#16A34A";

  const rows = pendencias
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-family:monospace;font-size:13px;">
          ${p.patrimonio}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;">
          ${p.servico}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;">
          ${p.periodicidade.replace(/_/g, " ")}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;white-space:nowrap;">
          ${formatarData(p.dataPrevista)}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;text-align:center;">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;color:#fff;background:${statusColor(p.status)};">
            ${statusLabel(p.status)}${p.status === "atrasado" ? ` (${Math.abs(p.diasRestantes)}d)` : ""}
          </span>
        </td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F9FAFB;">
  <div style="max-width:680px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
    <!-- Header -->
    <div style="background:${headerBg};padding:20px 24px;border-bottom:3px solid ${headerBorder};">
      <h1 style="margin:0 0 4px;font-size:18px;color:#111827;">LabCare — Notificação de Manutenções</h1>
      <p style="margin:0;font-size:14px;color:#6B7280;">
        ${labNome} — ${unidadeNome}
      </p>
    </div>

    <!-- Resumo -->
    <div style="padding:16px 24px;background:#F3F4F6;border-bottom:1px solid #E5E7EB;">
      <p style="margin:0;font-size:14px;color:#374151;">
        <strong>${pendencias.length}</strong> manutenção(ões) pendente(s)
        ${totalAtrasadas > 0 ? ` — <span style="color:#DC2626;font-weight:600;">${totalAtrasadas} atrasada(s)</span>` : ""}
        ${totalVencidas > 0 ? ` — <span style="color:#F59E0B;font-weight:600;">${totalVencidas} vence(m) hoje</span>` : ""}
        ${totalProximas > 0 ? ` — <span style="color:#16A34A;font-weight:600;">${totalProximas} a vencer</span>` : ""}
      </p>
    </div>

    <!-- Tabela -->
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#F9FAFB;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Patrimônio</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Serviço</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Periodicidade</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Data Prevista</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        E-mail gerado automaticamente pelo LabCare — Sistema de Manutenção Preventiva.
        <br>Não responda a esta mensagem.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── 3. Enviar via Microsoft Graph API ────────────────────────────────────────

/**
 * Obtém um token de acesso OAuth2 do Microsoft Graph usando client credentials.
 */
async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, tenantId } = getGraphConfig();

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Falha ao obter token Microsoft Graph: ${err}`);
  }

  const data = await tokenRes.json();
  return data.access_token;
}

/**
 * Envia um e-mail via Microsoft Graph API.
 */
async function enviarEmailGraph(to: string[], subject: string, htmlBody: string): Promise<void> {
  const { senderEmail } = getGraphConfig();
  const accessToken = await getAccessToken();

  const message = {
    message: {
      subject,
      body: { contentType: "HTML", content: htmlBody },
      toRecipients: to.map((email) => ({
        emailAddress: { address: email },
      })),
      from: { emailAddress: { address: senderEmail } },
    },
    saveToSentItems: "true",
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Falha ao enviar e-mail via Graph API: ${res.status} — ${err}`);
  }
}

// ─── 4. Orquestrador principal ────────────────────────────────────────────────

/**
 * Função principal que orquestra todo o processo de notificação:
 *  1. Busca pendências elegíveis.
 *  2. Agrupa por laboratório.
 *  3. Busca e-mail do administrador (destinatário padrão).
 *  4. Envia e-mail consolidado por laboratório.
 *  5. Registra log de cada envio.
 *
 * Pode ser chamada por:
 *   - POST /api/notificacoes/enviar (botão do dashboard)
 *   - Cron job (Vercel Cron, etc.)
 *   - Server Action
 *
 * ─── PONTO DE INTEGRAÇÃO PARA CRON JOB ─────────────────────────────────────
 * Para configurar um cron job no Vercel, adicione ao vercel.json:
 *
 *   {
 *     "crons": [{
 *       "path": "/api/notificacoes/enviar",
 *       "schedule": "0 8 * * *"
 *     }]
 *   }
 *
 * Isso executará a rota todos os dias às 08:00 UTC.
 * A rota deve detectar o header `x-vercel-cron` para pular a autenticação.
 *
 * Para testar localmente, configure um cron via node-cron:
 *   import cron from "node-cron";
 *   import { enviarNotificacoes } from "@/server/notifications";
 *   cron.schedule("0 8 * * *", () => enviarNotificacoes());
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function enviarNotificacoes(): Promise<ResultadoNotificacao> {
  const enviadoEm = new Date();
  const log: {
    console: string;
    success: boolean;
    details: string;
  } = {
    console: "",
    success: true,
    details: "",
  };

  console.log(`[NOTIFICAÇÕES] Início do processo: ${enviadoEm.toISOString()}`);

  try {
    // 1. Busca pendências elegíveis
    const pendencias = await buscarPendenciasElegiveis();

    if (pendencias.length === 0) {
      const msg = "Nenhuma pendência elegível para notificação.";
      console.log(`[NOTIFICAÇÕES] ${msg}`);
      return {
        totalPendencias: 0,
        emailsEnviados: 0,
        laboratoriosEnvolvidos: [],
        destinatarios: [],
        ErroEnvio: null,
        enviadoEm,
      };
    }

    console.log(`[NOTIFICAÇÕES] ${pendencias.length} pendência(s) elegível(is) encontrada(s).`);

    // 2. Agrupa por laboratório
    const porLab = new Map<string, PendenciaNotificavel[]>();
    for (const p of pendencias) {
      const existing = porLab.get(p.labId) ?? [];
      existing.push(p);
      porLab.set(p.labId, existing);
    }

    // 3. Busca e-mail do administrador para destinatário
    const [admin] = await db
      .select({ email: usuario.email, nome: usuario.nome })
      .from(usuario)
      .where(eq(usuario.perfil, "admin"))
      .limit(1);

    if (!admin?.email) {
      throw new Error("Nenhum administrador com e-mail encontrado no sistema.");
    }

    const destinatarios = [admin.email];
    const labsEnvolvidos: string[] = [];
    let emailsEnviados = 0;

    // 4. Envia e-mail consolidado por laboratório
    for (const [, pendenciasLab] of porLab) {
      const labNome = pendenciasLab[0].labNome;
      const unidadeNome = pendenciasLab[0].unidadeNome;

      const subject = `LabCare — ${pendenciasLab.length} manutenção(ões) pendente(s) — ${labNome}`;
      const htmlBody = montarCorpoEmail(labNome, unidadeNome, pendenciasLab);

      try {
        await enviarEmailGraph(destinatarios, subject, htmlBody);
        emailsEnviados++;
        labsEnvolvidos.push(labNome);

        console.log(
          `[NOTIFICAÇÕES] ✅ E-mail enviado com sucesso — Lab: ${labNome} | ` +
            `Pendências: ${pendenciasLab.length} | Destinatário: ${admin.email}`,
        );

        // Registra log de sucesso
        await db.insert(notificationLog).values({
          destinatarios: destinatarios.join(", "),
          totalPendencias: pendenciasLab.length,
          laboratoriosEnvolvidos: labNome,
          statusEnvio: "sucesso",
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[NOTIFICAÇÕES] ❌ Falha ao enviar e-mail — Lab: ${labNome} | Erro: ${errMsg}`,
        );

        // Registra log de falha
        await db.insert(notificationLog).values({
          destinatarios: destinatarios.join(", "),
          totalPendencias: pendenciasLab.length,
          laboratoriosEnvolvidos: labNome,
          statusEnvio: "erro",
          erroDetalhes: errMsg,
        });

        log.success = false;
        log.details = errMsg;
      }
    }

    const resultado: ResultadoNotificacao = {
      totalPendencias: pendencias.length,
      emailsEnviados,
      laboratoriosEnvolvidos: labsEnvolvidos,
      destinatarios,
      ErroEnvio: log.success ? null : log.details,
      enviadoEm,
    };

    console.log(
      `[NOTIFICAÇÕES] Fim do processo — ` +
        `Pendências: ${resultado.totalPendencias} | ` +
        `E-mails: ${resultado.emailsEnviados} | ` +
        `Labs: ${resultado.laboratoriosEnvolvidos.join(", ")}`,
    );

    return resultado;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[NOTIFICAÇÕES] ❌ Erro fatal: ${errMsg}`);

    // Registra log de erro geral
    await db
      .insert(notificationLog)
      .values({
        destinatarios: "N/A",
        totalPendencias: 0,
        laboratoriosEnvolvidos: "N/A",
        statusEnvio: "erro",
        erroDetalhes: errMsg,
      })
      .catch(() => {});

    throw err;
  }
}

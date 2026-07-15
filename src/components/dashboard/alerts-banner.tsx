"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OverdueAlert } from "@/lib/queries";

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AlertsBanner({ alerts }: { alerts: OverdueAlert[] }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (alerts.length === 0) return null;

  async function handleNotify() {
    setSending(true);
    try {
      const res = await fetch("/api/notificacoes/enviar", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSent(true);
        toast.success(data.mensagem || "Notificações enviadas com sucesso!");
      } else {
        toast.error(data.error || "Erro ao enviar notificações.");
      }
    } catch {
      toast.error("Erro de conexão ao enviar notificações.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">
            Manutenções Atrasadas — {alerts.length} item(ns)
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={sending || sent}
          onClick={handleNotify}
          title={
            sent
              ? "E-mails já enviados"
              : sending
                ? "Enviando..."
                : "Enviar notificação por e-mail para o administrador"
          }
        >
          {sending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : sent ? (
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-600" />
          ) : (
            <Mail className="mr-1.5 h-3.5 w-3.5" />
          )}
          {sent ? "Enviado" : sending ? "Enviando..." : "Notificar por e-mail"}
        </Button>
      </div>
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {alerts.map((a) => (
          <Link
            key={a.id}
            href={`/equipamentos/${a.equipamentoId}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200/60 bg-white px-3 py-2 text-sm transition-colors hover:bg-amber-100/60"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{a.patrimonio}</span>
              <span className="font-medium">{a.nomeEquipamento}</span>
              <span className="text-muted-foreground">— {a.laboratorio}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{formatDate(a.dataPrevista)}</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {a.diasAtraso}d atraso
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

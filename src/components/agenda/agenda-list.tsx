"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/components/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ManutencaoItem = {
  id: string;
  equipamentoId: string;
  planoItemNome: string;
  planoItemPeriodicidade: string;
  planoItemCategoria: string;
  dataPrevista: string;
  status: string;
};

type EquipamentoGroup = {
  equipamentoId: string;
  patrimonio: string;
  laboratorio: string;
  unidade: string;
  manutencoes: ManutencaoItem[];
};

type AgendaSection = {
  totalEquipamentos: number;
  totalManutencoes: number;
  equipamentos: EquipamentoGroup[];
};

type AgendaData = {
  data: string;
  atrasadas: AgendaSection;
  hoje: AgendaSection;
  proximosDias: AgendaSection;
};

function diasAtraso(dataPrevista: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prevista = new Date(dataPrevista);
  prevista.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje.getTime() - prevista.getTime()) / 86400000));
}

function diasAte(dataPrevista: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prevista = new Date(dataPrevista);
  prevista.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((prevista.getTime() - hoje.getTime()) / 86400000));
}

function formatarData(dataISO: string): string {
  return new Date(dataISO + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

function ConcluirDialog({
  manutencao,
  equipamento,
  user,
  onConcluido,
}: {
  manutencao: ManutencaoItem;
  equipamento: EquipamentoGroup;
  user: { id: string; perfil: string };
  onConcluido: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataExecutada, setDataExecutada] = useState(hojeISO());
  const [observacoes, setObservacoes] = useState("");

  const handleConcluir = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manutencoes/${manutencao.id}/concluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataExecutada,
          responsavelId: user.id,
          observacoes: observacoes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao concluir manutenção.");
        return;
      }

      toast.success("Manutenção concluída com sucesso!");
      setOpen(false);
      setObservacoes("");
      setDataExecutada(hojeISO());
      onConcluido();
    } catch {
      toast.error("Erro de conexão ao concluir manutenção.");
    } finally {
      setLoading(false);
    }
  };

  const atraso = diasAtraso(manutencao.dataPrevista);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluir
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir Manutenção</DialogTitle>
          <DialogDescription>
            {manutencao.planoItemNome} — {equipamento.patrimonio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {atraso > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Esta manutenção está atrasada há {atraso} dia(s).
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dataExecutada">Data de execução</Label>
            <Input
              id="dataExecutada"
              type="date"
              value={dataExecutada}
              onChange={(e) => setDataExecutada(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={user.id} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              {user.perfil === "admin"
                ? "Como administrador, você pode alterar o responsável."
                : "Responsável definido automaticamente como o usuário logado."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Descreva observações sobre a execução..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConcluir} disabled={loading || !dataExecutada}>
            {loading ? "Concluindo..." : "Confirmar Conclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EquipmentCard({
  group,
  user,
  onConcluido,
  secao,
}: {
  group: EquipamentoGroup;
  user: { id: string; perfil: string };
  onConcluido: () => void;
  secao: "atrasadas" | "hoje" | "proximosDias";
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const maiorAtraso = Math.max(...group.manutencoes.map((m) => diasAtraso(m.dataPrevista)));
  const concluidas = Object.values(checked).filter(Boolean).length;
  const podeConcluir = secao !== "proximosDias";

  return (
    <Card
      className={
        secao === "atrasadas"
          ? "border-red-200"
          : secao === "proximosDias"
            ? "border-blue-100 bg-blue-50/30"
            : ""
      }
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="font-mono text-sm text-muted-foreground">{group.patrimonio}</span>
            {secao === "atrasadas" && maiorAtraso > 0 && (
              <Badge variant="destructive" className="text-xs">
                Atrasada há {maiorAtraso} dia(s)
              </Badge>
            )}
            {secao === "proximosDias" && (
              <Badge variant="secondary" className="text-xs">
                Agendado
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {group.laboratorio}
            {group.unidade ? ` — ${group.unidade}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {podeConcluir && (
            <>
              <span className="text-xs text-muted-foreground">
                {concluidas}/{group.manutencoes.length} concluídas
              </span>
              <ConcluirDialog
                manutencao={group.manutencoes[0]}
                equipamento={group}
                user={user}
                onConcluido={onConcluido}
              />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {group.manutencoes.map((m) => {
            const atraso = diasAtraso(m.dataPrevista);
            const dias = diasAte(m.dataPrevista);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  checked[m.id]
                    ? "border-green-200 bg-green-50/50"
                    : secao === "atrasadas" && atraso > 0
                      ? "border-red-200 bg-red-50/30"
                      : ""
                }`}
              >
                {podeConcluir && (
                  <Checkbox
                    checked={checked[m.id] ?? false}
                    onCheckedChange={() => toggle(m.id)}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${checked[m.id] ? "text-green-700 line-through" : ""}`}
                  >
                    {m.planoItemNome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.planoItemCategoria} — {m.planoItemPeriodicidade}
                  </p>
                </div>
                {secao === "atrasadas" && atraso > 0 && !checked[m.id] && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    {atraso}d atraso
                  </Badge>
                )}
                {secao === "proximosDias" && dias > 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs text-blue-600">
                    em {dias} dia{dias > 1 ? "s" : ""} — {formatarData(m.dataPrevista)}
                  </Badge>
                )}
                {secao === "hoje" && atraso === 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Hoje
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  variant?: "danger" | "default" | "secondary";
}) {
  const iconColor =
    variant === "danger"
      ? "text-red-500"
      : variant === "secondary"
        ? "text-blue-500"
        : "text-foreground";
  const titleColor =
    variant === "danger"
      ? "text-red-700"
      : variant === "secondary"
        ? "text-blue-700"
        : "text-foreground";

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <h2 className={`text-lg font-heading ${titleColor}`}>{title}</h2>
      {count > 0 && (
        <Badge variant={variant === "danger" ? "destructive" : variant === "secondary" ? "secondary" : "default"}>
          {count}
        </Badge>
      )}
    </div>
  );
}

export function AgendaList() {
  const user = useUser();
  const [agenda, setAgenda] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/manutencoes/agenda-hoje");
        if (!res.ok) throw new Error("Erro ao carregar agenda.");
        const json = await res.json();
        if (!cancelled) {
          setAgenda(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Erro ao carregar agenda.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manutencoes/agenda-hoje");
      if (!res.ok) throw new Error("Erro ao carregar agenda.");
      const json = await res.json();
      setAgenda(json);
      setError(null);
    } catch {
      setError("Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            {Array.from({ length: 2 }).map((_, j) => (
              <Card key={j}>
                <CardHeader>
                  <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-12 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!agenda) return null;

  const totalGeral =
    agenda.atrasadas.totalManutencoes + agenda.hoje.totalManutencoes + agenda.proximosDias.totalManutencoes;
  const equipamentosGeral =
    new Set([
      ...agenda.atrasadas.equipamentos.map((e) => e.equipamentoId),
      ...agenda.hoje.equipamentos.map((e) => e.equipamentoId),
      ...agenda.proximosDias.equipamentos.map((e) => e.equipamentoId),
    ]).size;

  if (totalGeral === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <CalendarCheck className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-heading font-semibold">Nenhuma manutenção pendente</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Não há manutenções atrasadas, para hoje ou nos próximos 7 dias. Aproveite para revisar os
            planos ou a agenda da semana.
          </p>
        </CardContent>
      </Card>
    );
  }

  const userProps = { id: user?.id ?? "", perfil: user?.perfil ?? "tecnico" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>
          <strong className="text-foreground">{totalGeral}</strong> manutenção(ões) em{" "}
          <strong className="text-foreground">{equipamentosGeral}</strong> equipamento(s)
        </span>
      </div>

      {agenda.atrasadas.totalManutencoes > 0 && (
        <section className="space-y-3">
          <SectionHeader
            icon={AlertTriangle}
            title="Manutenções Atrasadas"
            count={agenda.atrasadas.totalManutencoes}
            variant="danger"
          />
          {agenda.atrasadas.equipamentos.map((group) => (
            <EquipmentCard
              key={group.equipamentoId}
              group={group}
              user={userProps}
              onConcluido={refetch}
              secao="atrasadas"
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader
          icon={CalendarCheck}
          title="Hoje"
          count={agenda.hoje.totalManutencoes}
          variant="default"
        />
        {agenda.hoje.equipamentos.length > 0 ? (
          agenda.hoje.equipamentos.map((group) => (
            <EquipmentCard
              key={group.equipamentoId}
              group={group}
              user={userProps}
              onConcluido={refetch}
              secao="hoje"
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma manutenção programada para hoje.
          </p>
        )}
      </section>

      {agenda.proximosDias.totalManutencoes > 0 && (
        <section className="space-y-3">
          <SectionHeader
            icon={CalendarClock}
            title="Próximos 7 Dias"
            count={agenda.proximosDias.totalManutencoes}
            variant="secondary"
          />
          {agenda.proximosDias.equipamentos.map((group) => (
            <EquipmentCard
              key={group.equipamentoId}
              group={group}
              user={userProps}
              onConcluido={refetch}
              secao="proximosDias"
            />
          ))}
        </section>
      )}
    </div>
  );
}

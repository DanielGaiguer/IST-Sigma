"use client";

import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Manutencao = {
  id: string;
  equipamentoPatrimonio: string;
  planoItemNome: string;
  planoItemPeriodicidade: string;
  planoItemCategoria: string;
  dataPrevista: string;
  status: string;
  laboratorioNome: string;
  unidadeNome: string;
};

const STATUS_LABELS: Record<string, string> = {
  programada: "Programada",
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  programada: "bg-blue-100 text-blue-800",
  pendente: "bg-yellow-100 text-yellow-800",
  em_andamento: "bg-orange-100 text-orange-800",
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-gray-100 text-gray-700",
};

const PAGE_SIZE = 20;

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function ManutencoesPage() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const res = await fetch("/api/manutencoes");
        if (!cancelled && res.ok) setManutencoes(await res.json());
      } catch {
        if (!cancelled) toast.error("Erro ao carregar manutenções.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return manutencoes.filter((m) => {
      if (
        search &&
        !m.equipamentoPatrimonio.toLowerCase().includes(search.toLowerCase()) &&
        !m.planoItemNome.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterStatus !== "all" && m.status !== filterStatus) return false;
      return true;
    });
  }, [manutencoes, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          Manutenções Programadas
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualização de todas as manutenções preventivas programadas.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por patrimônio ou serviço..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Periocidade</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Laboratório</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {search || filterStatus !== "all"
                            ? "Nenhuma manutenção encontrada para os filtros aplicados."
                            : "Nenhuma manutenção programada."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {m.equipamentoPatrimonio}
                          </TableCell>
                          <TableCell className="text-sm">{m.planoItemNome}</TableCell>
                          <TableCell className="text-sm capitalize">
                            {m.planoItemPeriodicidade.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-sm">{m.planoItemCategoria}</TableCell>
                          <TableCell className="text-sm">{formatDate(m.dataPrevista)}</TableCell>
                          <TableCell className="text-sm">{m.laboratorioNome}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[m.status] ?? ""} variant="outline">
                              {STATUS_LABELS[m.status] ?? m.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} manutenção(ões) — Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

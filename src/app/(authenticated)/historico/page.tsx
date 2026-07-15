"use client";

import { useState, useEffect, useMemo } from "react";
import { History, Search, ChevronLeft, ChevronRight, Download, Calendar } from "lucide-react";
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

type Historico = {
  id: string;
  equipamentoId: string;
  equipamentoPatrimonio: string;
  planoItemNome: string;
  planoItemCategoria: string;
  dataPrevista: string;
  dataExecutada: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  status: string;
  observacoes: string | null;
  diasAtraso: number | null;
  dataProximaManutencao: string | null;
  laboratorioId: string;
  laboratorioNome: string;
  unidadeNome: string;
};

type RefItem = { id: string; nome: string };

const STATUS_LABELS: Record<string, string> = {
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-gray-100 text-gray-700",
};

const PAGE_SIZE = 20;

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEquipamento, setFilterEquipamento] = useState("all");
  const [filterLaboratorio, setFilterLaboratorio] = useState("all");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [page, setPage] = useState(0);

  const [equipamentos, setEquipamentos] = useState<RefItem[]>([]);
  const [laboratorios, setLaboratorios] = useState<RefItem[]>([]);
  const [responsaveis, setResponsaveis] = useState<RefItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [histRes, eqRes, labRes, usrRes] = await Promise.all([
          fetch("/api/historico"),
          fetch("/api/equipamentos"),
          fetch("/api/laboratorios"),
          fetch("/api/usuarios"),
        ]);
        if (!cancelled) {
          if (histRes.ok) setHistorico(await histRes.json());
          if (eqRes.ok) {
            const data: { id: string; patrimonio: string }[] = await eqRes.json();
            setEquipamentos(data.map((e) => ({ id: e.id, nome: e.patrimonio })));
          }
          if (labRes.ok) {
            const data: { id: string; nome: string }[] = await labRes.json();
            setLaboratorios(data);
          }
          if (usrRes.ok) {
            const data: { id: string; nome: string }[] = await usrRes.json();
            setResponsaveis(data);
          }
        }
      } catch {
        if (!cancelled) toast.error("Erro ao carregar dados.");
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
    return historico.filter((h) => {
      if (
        search &&
        !h.equipamentoPatrimonio.toLowerCase().includes(search.toLowerCase()) &&
        !h.planoItemNome.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterStatus !== "all" && h.status !== filterStatus) return false;
      if (filterEquipamento !== "all" && h.equipamentoId !== filterEquipamento) return false;
      if (filterLaboratorio !== "all" && h.laboratorioId !== filterLaboratorio) return false;
      if (filterResponsavel !== "all" && h.responsavelId !== filterResponsavel) return false;
      if (filterDataInicio) {
        const d = new Date(h.dataExecutada);
        if (d < new Date(filterDataInicio)) return false;
      }
      if (filterDataFim) {
        const d = new Date(h.dataExecutada);
        if (d > new Date(filterDataFim + "T23:59:59")) return false;
      }
      return true;
    });
  }, [
    historico,
    search,
    filterStatus,
    filterEquipamento,
    filterLaboratorio,
    filterResponsavel,
    filterDataInicio,
    filterDataFim,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleExportCsv() {
    if (filtered.length === 0) {
      toast.error("Nenhum registro para exportar.");
      return;
    }
    const header = [
      "Patrimônio",
      "Serviço",
      "Categoria",
      "Laboratório",
      "Data Prevista",
      "Data Executada",
      "Dias de Atraso",
      "Próxima Manutenção",
      "Responsável",
      "Status",
      "Observações",
    ];
    const rows = filtered.map((h) => [
      h.equipamentoPatrimonio,
      h.planoItemNome,
      h.planoItemCategoria,
      h.laboratorioNome,
      formatDate(h.dataPrevista),
      formatDate(h.dataExecutada),
      h.diasAtraso != null && h.diasAtraso > 0 ? `${h.diasAtraso} dia(s)` : "No prazo",
      formatDate(h.dataProximaManutencao),
      h.responsavelNome ?? "—",
      STATUS_LABELS[h.status] ?? h.status,
      (h.observacoes ?? "").replace(/"/g, '""'),
    ]);
    const csvContent =
      "\uFEFF" + [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_manutencoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }

  const hasActiveFilters =
    search ||
    filterStatus !== "all" ||
    filterEquipamento !== "all" ||
    filterLaboratorio !== "all" ||
    filterResponsavel !== "all" ||
    filterDataInicio ||
    filterDataFim;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <History className="h-6 w-6 text-blue-600" />
            Histórico de Manutenções
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de todas as manutenções já realizadas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={loading || filtered.length === 0}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar patrimônio ou serviço..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={filterEquipamento}
              onValueChange={(v) => {
                setFilterEquipamento(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos equipamentos</SelectItem>
                {equipamentos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterLaboratorio}
              onValueChange={(v) => {
                setFilterLaboratorio(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Laboratório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos laboratórios</SelectItem>
                {laboratorios.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterResponsavel}
              onValueChange={(v) => {
                setFilterResponsavel(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => {
                  setFilterDataInicio(e.target.value);
                  setPage(0);
                }}
                className="w-[130px] sm:w-[155px]"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => {
                  setFilterDataFim(e.target.value);
                  setPage(0);
                }}
                className="w-[130px] sm:w-[155px]"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                  setFilterEquipamento("all");
                  setFilterLaboratorio("all");
                  setFilterResponsavel("all");
                  setFilterDataInicio("");
                  setFilterDataFim("");
                  setPage(0);
                }}
              >
                Limpar filtros
              </Button>
            )}
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
                      <TableHead>Laboratório</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Data Executada</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead>Próx. Manutenção</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          {hasActiveFilters
                            ? "Nenhum registro encontrado para os filtros aplicados."
                            : "Nenhum registro de histórico encontrado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {h.equipamentoPatrimonio}
                          </TableCell>
                          <TableCell className="text-sm">{h.planoItemNome}</TableCell>
                          <TableCell className="text-sm">{h.laboratorioNome}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(h.dataPrevista)}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(h.dataExecutada)}
                          </TableCell>
                          <TableCell className="text-sm">{h.responsavelNome ?? "—"}</TableCell>
                          <TableCell className="text-sm">
                            {h.diasAtraso != null && h.diasAtraso > 0 ? (
                              <span className="font-medium text-red-600">
                                {h.diasAtraso} dia(s)
                              </span>
                            ) : (
                              <span className="text-green-600">No prazo</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(h.dataProximaManutencao)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[h.status] ?? ""} variant="outline">
                              {STATUS_LABELS[h.status] ?? h.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {h.observacoes ?? "—"}
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
                    {filtered.length} registro(s) — Página {page + 1} de {totalPages}
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

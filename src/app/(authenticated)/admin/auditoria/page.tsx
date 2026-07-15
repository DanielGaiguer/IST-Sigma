"use client";

import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Search, ChevronLeft, ChevronRight, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/components/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Auditoria = {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  operacao: string;
  entidade: string;
  registroId: string;
  valorAnterior: Record<string, unknown> | null;
  valorNovo: Record<string, unknown> | null;
};

type RefItem = { id: string; nome: string };

const OPERACAO_LABELS: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
};

const OPERACAO_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

const ENTIDADE_LABELS: Record<string, string> = {
  usuario: "Usuário",
  equipamento: "Equipamento",
  laboratorio: "Laboratório",
  unidade: "Unidade",
  fabricante: "Fabricante",
  modelo: "Modelo",
  tipo_equipamento: "Tipo de Equipamento",
  classificacao: "Classificação",
  plano_manutencao: "Plano de Manutenção",
  plano_item: "Item do Plano",
  manutencao_programada: "Manutenção Programada",
  historico_manutencao: "Histórico de Manutenção",
};

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  nome: "Nome",
  email: "E-mail",
  perfil: "Perfil",
  patrimonio: "Patrimônio",
  numero_serie: "Número de Série",
  situacao: "Situação",
  fabricante_id: "Fabricante",
  modelo_id: "Modelo",
  tipo_equipamento_id: "Tipo de Equipamento",
  classificacao_id: "Classificação",
  unidade_id: "Unidade",
  laboratorio_id: "Laboratório",
  data_cadastro: "Data de Cadastro",
  criado_em: "Criado em",
  atualizado_em: "Atualizado em",
  nivel: "Nível",
  status: "Status",
  periodicidade: "Periodicidade",
  categoria: "Categoria",
  descricao: "Descrição",
  equipamento_id: "Equipamento",
  plano_item_id: "Item do Plano",
  data_prevista: "Data Prevista",
  data_executada: "Data Executada",
  responsavel_id: "Responsável",
  observacoes: "Observações",
  dias_atraso: "Dias de Atraso",
  data_proxima_manutencao: "Próxima Manutenção",
  senha_hash: "Senha",
  usuario_id: "Usuário",
  operacao: "Operação",
  entidade: "Entidade",
  registro_id: "Registro",
  valor_anterior: "Valor Anterior",
  valor_novo: "Valor Novo",
  data_hora: "Data/Hora",
  manutencao_programada_id: "Manutenção Programada",
  unidade: "Unidade",
};

const PAGE_SIZE = 20;

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR");
}

function formatJsonValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString("pt-BR");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DiffView({
  anterior,
  novo,
}: {
  anterior: Record<string, unknown> | null;
  novo: Record<string, unknown> | null;
}) {
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    if (anterior) Object.keys(anterior).forEach((k) => keys.add(k));
    if (novo) Object.keys(novo).forEach((k) => keys.add(k));
    return Array.from(keys).filter((k) => k !== "senha_hash");
  }, [anterior, novo]);

  if (allKeys.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">Sem detalhes disponíveis.</p>
    );
  }

  return (
    <div className="space-y-1">
      {allKeys.map((key) => {
        const oldVal = anterior?.[key];
        const newVal = novo?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        const label = FIELD_LABELS[key] ?? key.replace(/_/g, " ");

        return (
          <div
            key={key}
            className={`rounded-md px-3 py-2 text-sm ${
              changed ? "bg-yellow-50 dark:bg-yellow-950/30" : ""
            }`}
          >
            <span className="font-medium text-muted-foreground">{label}</span>
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Antes: </span>
                <span className={changed ? "text-red-600 line-through" : ""}>
                  {formatJsonValue(key, oldVal)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Depois: </span>
                <span className={changed ? "font-medium text-green-700" : ""}>
                  {formatJsonValue(key, newVal)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditoriaPage() {
  const user = useUser();
  const [registros, setRegistros] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("all");
  const [filterEntidade, setFilterEntidade] = useState("all");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [page, setPage] = useState(0);
  const [detailDialog, setDetailDialog] = useState<Auditoria | null>(null);

  const [usuarios, setUsuarios] = useState<RefItem[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [audRes, usrRes] = await Promise.all([
          fetch("/api/auditoria"),
          fetch("/api/usuarios"),
        ]);
        if (!cancelled) {
          if (audRes.ok) {
            const data: Auditoria[] = await audRes.json();
            setRegistros(data);
            const entSet = new Set<string>();
            data.forEach((r) => entSet.add(r.entidade));
            setEntidades(Array.from(entSet).sort());
          }
          if (usrRes.ok) {
            const data: { id: string; nome: string }[] = await usrRes.json();
            setUsuarios(data);
          }
        }
      } catch {
        if (!cancelled) toast.error("Erro ao carregar auditoria.");
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
    return registros.filter((r) => {
      if (
        search &&
        !r.usuarioNome.toLowerCase().includes(search.toLowerCase()) &&
        !r.entidade.toLowerCase().includes(search.toLowerCase()) &&
        !r.operacao.toLowerCase().includes(search.toLowerCase()) &&
        !r.registroId.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterUsuario !== "all" && r.usuarioId !== filterUsuario) return false;
      if (filterEntidade !== "all" && r.entidade !== filterEntidade) return false;
      if (filterDataInicio) {
        const d = new Date(r.dataHora);
        if (d < new Date(filterDataInicio)) return false;
      }
      if (filterDataFim) {
        const d = new Date(r.dataHora);
        if (d > new Date(filterDataFim + "T23:59:59")) return false;
      }
      return true;
    });
  }, [registros, search, filterUsuario, filterEntidade, filterDataInicio, filterDataFim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasActiveFilters =
    search ||
    filterUsuario !== "all" ||
    filterEntidade !== "all" ||
    filterDataInicio ||
    filterDataFim;

  if (user?.perfil !== "admin") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          Auditoria
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro de todas as alterações realizadas no sistema.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={filterUsuario}
              onValueChange={(v) => {
                setFilterUsuario(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterEntidade}
              onValueChange={(v) => {
                setFilterEntidade(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {entidades.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ENTIDADE_LABELS[e] ?? e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => {
                  setFilterDataInicio(e.target.value);
                  setPage(0);
                }}
                className="w-[120px] sm:w-[140px]"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => {
                  setFilterDataFim(e.target.value);
                  setPage(0);
                }}
                className="w-[120px] sm:w-[140px]"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterUsuario("all");
                  setFilterEntidade("all");
                  setFilterDataInicio("");
                  setFilterDataFim("");
                  setPage(0);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}

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
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          {hasActiveFilters
                            ? "Nenhum registro encontrado para os filtros aplicados."
                            : "Nenhum registro de auditoria encontrado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(r.dataHora)}
                          </TableCell>
                          <TableCell className="text-sm">{r.usuarioNome}</TableCell>
                          <TableCell>
                            <Badge className={OPERACAO_COLORS[r.operacao] ?? ""} variant="outline">
                              {OPERACAO_LABELS[r.operacao] ?? r.operacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {ENTIDADE_LABELS[r.entidade] ?? r.entidade}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.registroId.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDetailDialog(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      <Dialog
        open={!!detailDialog}
        onOpenChange={(o) => {
          if (!o) setDetailDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Alteração</DialogTitle>
            <DialogDescription>
              {detailDialog &&
                `${OPERACAO_LABELS[detailDialog.operacao] ?? detailDialog.operacao} em ${
                  ENTIDADE_LABELS[detailDialog.entidade] ?? detailDialog.entidade
                } — ${formatDateTime(detailDialog.dataHora)}`}
            </DialogDescription>
          </DialogHeader>
          {detailDialog && (
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <DiffView anterior={detailDialog.valorAnterior} novo={detailDialog.valorNovo} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

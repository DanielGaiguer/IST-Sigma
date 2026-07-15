"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
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

type Equipamento = {
  id: string;
  patrimonio: string;
  numeroSerie: string;
  situacao: string;
  fabricanteNome: string;
  modeloNome: string;
  tipoEquipamentoNome: string;
  classificacaoNome: string;
  laboratorioNome: string;
  unidadeNome: string;
};

type RefItem = { id: string; nome: string };

const SITUACAO_LABELS: Record<string, string> = {
  ativo: "Ativo",
  fora_de_uso: "Fora de Uso",
  em_manutencao: "Em Manutenção",
  descartado: "Descartado",
};

const SITUACAO_COLORS: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  fora_de_uso: "bg-gray-100 text-gray-700",
  em_manutencao: "bg-yellow-100 text-yellow-800",
  descartado: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 15;

export default function EquipamentosPage() {
  const user = useUser();
  const router = useRouter();
  const isAdmin = user?.perfil === "admin";

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("all");
  const [filterFabricante, setFilterFabricante] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterClassificacao, setFilterClassificacao] = useState("all");
  const [filterLaboratorio, setFilterLaboratorio] = useState("all");
  const [page, setPage] = useState(0);

  const [fabricantes, setFabricantes] = useState<RefItem[]>([]);
  const [tipos, setTipos] = useState<RefItem[]>([]);
  const [classificacoes, setClassificacoes] = useState<RefItem[]>([]);
  const [laboratorios, setLaboratorios] = useState<RefItem[]>([]);

  useEffect(() => {
    async function load() {
      const [eqRes, fabRes, tipRes, clsRes, labRes] = await Promise.all([
        fetch("/api/equipamentos"),
        fetch("/api/fabricantes"),
        fetch("/api/tipos-equipamento"),
        fetch("/api/classificacoes"),
        fetch("/api/laboratorios"),
      ]);
      if (eqRes.ok) setEquipamentos(await eqRes.json());
      if (fabRes.ok) setFabricantes(await fabRes.json());
      if (tipRes.ok) setTipos(await tipRes.json());
      if (clsRes.ok) setClassificacoes(await clsRes.json());
      if (labRes.ok) setLaboratorios(await labRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const filtered = equipamentos.filter((e) => {
    if (search && !e.patrimonio.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSituacao !== "all" && e.situacao !== filterSituacao) return false;
    if (filterFabricante !== "all" && e.fabricanteNome !== filterFabricante) return false;
    if (filterTipo !== "all" && e.tipoEquipamentoNome !== filterTipo) return false;
    if (filterClassificacao !== "all" && e.classificacaoNome !== filterClassificacao) return false;
    if (filterLaboratorio !== "all" && e.laboratorioNome !== filterLaboratorio) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wrench className="h-6 w-6 text-blue-600" />
            Equipamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de equipamentos laboratoriais.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/equipamentos/novo")} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Equipamento
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por patrimônio..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={filterSituacao}
              onValueChange={(v) => {
                setFilterSituacao(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="fora_de_uso">Fora de Uso</SelectItem>
                <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterFabricante}
              onValueChange={(v) => {
                setFilterFabricante(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Fabricante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {fabricantes.map((f) => (
                  <SelectItem key={f.id} value={f.nome}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterTipo}
              onValueChange={(v) => {
                setFilterTipo(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.nome}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterClassificacao}
              onValueChange={(v) => {
                setFilterClassificacao(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {classificacoes.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {c.nome}
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Laboratório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {laboratorios.map((l) => (
                  <SelectItem key={l.id} value={l.nome}>
                    {l.nome}
                  </SelectItem>
                ))}
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
                      <TableHead>Laboratório</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {search ||
                          filterSituacao !== "all" ||
                          filterFabricante !== "all" ||
                          filterTipo !== "all" ||
                          filterClassificacao !== "all" ||
                          filterLaboratorio !== "all"
                            ? "Nenhum equipamento encontrado para os filtros aplicados."
                            : "Nenhum equipamento cadastrado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((eq) => (
                        <TableRow key={eq.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {eq.patrimonio}
                          </TableCell>
                          <TableCell className="text-sm">{eq.laboratorioNome}</TableCell>
                          <TableCell className="text-sm">{eq.fabricanteNome}</TableCell>
                          <TableCell className="text-sm">{eq.modeloNome}</TableCell>
                          <TableCell className="text-sm">{eq.classificacaoNome}</TableCell>
                          <TableCell>
                            <Badge className={SITUACAO_COLORS[eq.situacao] ?? ""} variant="outline">
                              {SITUACAO_LABELS[eq.situacao] ?? eq.situacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => router.push(`/equipamentos/${eq.id}`)}
                              title="Ver detalhes"
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
                    {filtered.length} equipamento(s) — Página {page + 1} de {totalPages}
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

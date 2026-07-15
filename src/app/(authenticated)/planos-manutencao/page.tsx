"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Eye,
  ChevronRight,
  Layers,
  Tag,
  Puzzle,
  AlertTriangle,
  Info,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { useCrudResource, useSelectResources } from "@/hooks/use-crud-resource";
import { useUser } from "@/components/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Plano = {
  id: string;
  nome: string;
  nivel: "base" | "classificacao" | "modelo";
  classificacaoId: string | null;
  modeloId: string | null;
  criadoEm: string;
  atualizadoEm: string;
  classificacaoNome: string | null;
  modeloNome: string | null;
};

type PlanoItem = {
  id: string;
  planoManutencaoId: string;
  nome: string;
  descricao: string | null;
  periodicidade: string;
  categoria: string;
  status: "ativo" | "inativo";
  criadoEm: string;
  atualizadoEm: string;
};

type PlanoDetail = Plano & { itens: PlanoItem[] };

type Equipamento = {
  id: string;
  patrimonio: string;
  numeroSerie: string;
  classificacaoNome: string;
  modeloNome: string;
};

type ConsolidadoItem = {
  planoManutencaoId: string;
  planoManutencaoNome: string;
  nivel: "base" | "classificacao" | "modelo";
  planoItemId: string;
  nome: string;
  descricao: string | null;
  periodicidade: string;
  categoria: string;
};

type ConsolidadoResponse = {
  equipamentoId: string;
  totalItens: number;
  porNivel: {
    base: ConsolidadoItem[];
    classificacao: ConsolidadoItem[];
    modelo: ConsolidadoItem[];
  };
  todosItens: ConsolidadoItem[];
};

const NIVEL_CONFIG = {
  base: {
    label: "Base",
    icon: Layers,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Aplica-se a todos os equipamentos",
  },
  classificacao: {
    label: "Classificação",
    icon: Tag,
    color: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Aplica-se aos equipamentos da classificação",
  },
  modelo: {
    label: "Modelo",
    icon: Puzzle,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Aplica-se ao modelo específico",
  },
};

const PERIODICIDADE_LABELS: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const PERIODICIDADE_OPTIONS = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export default function PlanosManutencaoPage() {
  const user = useUser();
  const isAdmin = user?.perfil === "admin";

  const {
    items: planosRaw,
    loading: planosLoading,
    create: createPlano,
    update: updatePlano,
  } = useCrudResource("/api/planos-manutencao");
  const planos = planosRaw as unknown as Plano[];

  const selectMap = useSelectResources([
    "/api/classificacoes",
    "/api/modelos",
    "/api/equipamentos",
  ]);

  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<PlanoDetail | null>(null);
  const [planosLoading2, setPlanosLoading2] = useState(false);

  const [itens, setItens] = useState<PlanoItem[]>([]);

  const [planoDialogOpen, setPlanoDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [planoForm, setPlanoForm] = useState({
    nome: "",
    nivel: "base" as "base" | "classificacao" | "modelo",
    classificacaoId: "",
    modeloId: "",
  });
  const [planoSaving, setPlanoSaving] = useState(false);
  const [planoFormError, setPlanoFormError] = useState<string | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanoItem | null>(null);
  const [itemForm, setItemForm] = useState({
    nome: "",
    descricao: "",
    periodicidade: "mensal",
    categoria: "",
    status: "ativo" as "ativo" | "inativo",
  });
  const [itemSaving, setItemSaving] = useState(false);
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PlanoItem | null>(null);
  const [deletingItemLoading, setDeletingItemLoading] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateEquipamentoId, setSimulateEquipamentoId] = useState("");
  const [consolidado, setConsolidado] = useState<ConsolidadoResponse | null>(null);
  const [consolidadoLoading, setConsolidadoLoading] = useState(false);

  const classificacoes = selectMap["/api/classificacoes"] ?? [];
  const modelos = selectMap["/api/modelos"] ?? [];
  const equipamentos = (selectMap["/api/equipamentos"] ?? []) as unknown as Equipamento[];

  const loadPlanoDetail = useCallback(async (id: string) => {
    setPlanosLoading2(true);
    try {
      const res = await fetch(`/api/planos-manutencao/${id}`);
      if (res.ok) {
        const data: PlanoDetail = await res.json();
        setSelectedPlano(data);
        setItens(data.itens);
      }
    } catch {
      toast.error("Erro ao carregar detalhes do plano.");
    } finally {
      setPlanosLoading2(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPlanoId) return;
    let cancelled = false;
    async function init() {
      setPlanosLoading2(true);
      try {
        const res = await fetch(`/api/planos-manutencao/${selectedPlanoId}`);
        if (!cancelled && res.ok) {
          const data: PlanoDetail = await res.json();
          setSelectedPlano(data);
          setItens(data.itens);
        }
      } catch {
        if (!cancelled) toast.error("Erro ao carregar detalhes do plano.");
      } finally {
        if (!cancelled) setPlanosLoading2(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [selectedPlanoId]);

  const planosAgrupados = {
    base: planos.filter((p) => p.nivel === "base"),
    classificacao: planos.filter((p) => p.nivel === "classificacao"),
    modelo: planos.filter((p) => p.nivel === "modelo"),
  };

  function openCreatePlano() {
    setEditingPlano(null);
    setPlanoForm({ nome: "", nivel: "base", classificacaoId: "", modeloId: "" });
    setPlanoFormError(null);
    setPlanoDialogOpen(true);
  }

  function openEditPlano(plano: Plano) {
    setEditingPlano(plano);
    setPlanoForm({
      nome: plano.nome,
      nivel: plano.nivel,
      classificacaoId: plano.classificacaoId ?? "",
      modeloId: plano.modeloId ?? "",
    });
    setPlanoFormError(null);
    setPlanoDialogOpen(true);
  }

  async function handleSavePlano() {
    setPlanoSaving(true);
    setPlanoFormError(null);
    const body: Record<string, string> = { nome: planoForm.nome, nivel: planoForm.nivel };
    if (planoForm.classificacaoId) body.classificacaoId = planoForm.classificacaoId;
    if (planoForm.modeloId) body.modeloId = planoForm.modeloId;

    const result = editingPlano
      ? await updatePlano(editingPlano.id, body)
      : await createPlano(body);

    if (result.ok) {
      toast.success(editingPlano ? "Plano atualizado com sucesso." : "Plano criado com sucesso.");
      setPlanoDialogOpen(false);
      if (editingPlano && selectedPlanoId === editingPlano.id) loadPlanoDetail(editingPlano.id);
    } else {
      setPlanoFormError(result.error);
    }
    setPlanoSaving(false);
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({
      nome: "",
      descricao: "",
      periodicidade: "mensal",
      categoria: "",
      status: "ativo",
    });
    setItemFormError(null);
    setItemDialogOpen(true);
  }

  function openEditItem(item: PlanoItem) {
    setEditingItem(item);
    setItemForm({
      nome: item.nome,
      descricao: item.descricao ?? "",
      periodicidade: item.periodicidade,
      categoria: item.categoria,
      status: item.status,
    });
    setItemFormError(null);
    setItemDialogOpen(true);
  }

  async function handleSaveItem() {
    if (!selectedPlanoId) return;
    setItemSaving(true);
    setItemFormError(null);
    const body: Record<string, string> = {
      nome: itemForm.nome,
      periodicidade: itemForm.periodicidade,
      categoria: itemForm.categoria,
      status: itemForm.status,
    };
    if (itemForm.descricao) body.descricao = itemForm.descricao;

    const url = editingItem
      ? `/api/planos-manutencao/${selectedPlanoId}/itens/${editingItem.id}`
      : `/api/planos-manutencao/${selectedPlanoId}/itens`;
    const method = editingItem ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setItemFormError(err.error || "Erro ao salvar item.");
        return;
      }
      toast.success(editingItem ? "Item atualizado com sucesso." : "Item criado com sucesso.");
      setItemDialogOpen(false);
      loadPlanoDetail(selectedPlanoId);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setItemSaving(false);
    }
  }

  function openDeleteItemDialog(item: PlanoItem) {
    setDeletingItem(item);
    setDeleteItemError(null);
    setDeleteItemDialogOpen(true);
  }

  async function handleDeleteItem() {
    if (!deletingItem || !selectedPlanoId) return;
    setDeletingItemLoading(true);
    setDeleteItemError(null);
    try {
      const res = await fetch(
        `/api/planos-manutencao/${selectedPlanoId}/itens/${deletingItem.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        setDeleteItemError(err.error || "Erro ao excluir item.");
        return;
      }
      toast.success("Item excluído com sucesso.");
      setDeleteItemDialogOpen(false);
      setDeletingItem(null);
      loadPlanoDetail(selectedPlanoId);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setDeletingItemLoading(false);
    }
  }

  async function handleSimulate() {
    if (!simulateEquipamentoId) return;
    setConsolidadoLoading(true);
    setConsolidado(null);
    try {
      const res = await fetch(`/api/planos-manutencao/consolidado/${simulateEquipamentoId}`);
      if (res.ok) setConsolidado(await res.json());
      else toast.error("Erro ao simular plano consolidado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setConsolidadoLoading(false);
    }
  }

  function getInheritanceWarning(): string | null {
    if (!selectedPlano) return null;
    if (selectedPlano.nivel === "classificacao") {
      return "Equipamentos desta classificação também herdam todos os itens do plano Base do seu Tipo.";
    }
    if (selectedPlano.nivel === "modelo") {
      return "Equipamentos deste modelo herdam todos os itens dos planos Base e de Classificação.";
    }
    return null;
  }

  const inheritanceWarning = getInheritanceWarning();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Planos de Manutenção
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os planos preventivos e seus itens de manutenção.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSimulateOpen(true)} className="gap-1.5">
            <Eye className="h-4 w-4" />
            Simular Plano
          </Button>
          {isAdmin && (
            <Button onClick={openCreatePlano} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          {(["base", "classificacao", "modelo"] as const).map((nivel) => {
            const cfg = NIVEL_CONFIG[nivel];
            const Icon = cfg.icon;
            const planosNivel = planosAgrupados[nivel];
            return (
              <Card key={nivel}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {planosNivel.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {planosLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : planosNivel.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">Nenhum plano</p>
                  ) : (
                    <div className="space-y-1">
                      {planosNivel.map((plano) => (
                        <div
                          key={plano.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPlanoId(plano.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPlanoId(plano.id);
                            }
                          }}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                            selectedPlanoId === plano.id ? "bg-muted font-medium" : ""
                          }`}
                        >
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{plano.nome}</div>
                            {(plano.classificacaoNome || plano.modeloNome) && (
                              <div className="truncate text-xs text-muted-foreground">
                                {plano.modeloNome
                                  ? `${plano.classificacaoNome ?? ""} › ${plano.modeloNome}`
                                  : plano.classificacaoNome}
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditPlano(plano);
                              }}
                              title="Editar plano"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          {!selectedPlanoId ? (
            <Card className="flex h-[400px] items-center justify-center">
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Selecione um plano na lateral para ver seus itens.
                </p>
              </CardContent>
            </Card>
          ) : planosLoading2 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : selectedPlano ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedPlano.nome}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge className={NIVEL_CONFIG[selectedPlano.nivel].color} variant="outline">
                        {NIVEL_CONFIG[selectedPlano.nivel].label}
                      </Badge>
                      {selectedPlano.classificacaoNome && (
                        <span className="text-sm text-muted-foreground">
                          Classificação: {selectedPlano.classificacaoNome}
                        </span>
                      )}
                      {selectedPlano.modeloNome && (
                        <span className="text-sm text-muted-foreground">
                          › Modelo: {selectedPlano.modeloNome}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button onClick={openCreateItem} className="gap-1.5" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Novo Item
                    </Button>
                  )}
                </div>
                {inheritanceWarning && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <Info className="h-4 w-4 shrink-0" />
                    {inheritanceWarning}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {itens.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Nenhum item cadastrado neste plano.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Periocidade</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Status</TableHead>
                          {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item) => (
                          <TableRow
                            key={item.id}
                            className={item.status === "inativo" ? "opacity-50" : ""}
                          >
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {item.descricao ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {PERIODICIDADE_LABELS[item.periodicidade] ?? item.periodicidade}
                            </TableCell>
                            <TableCell className="text-sm">{item.categoria}</TableCell>
                            <TableCell>
                              {item.status === "ativo" ? (
                                <Badge className="bg-green-100 text-green-800" variant="outline">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600" variant="outline">
                                  Inativo
                                </Badge>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openEditItem(item)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      item.status === "ativo"
                                        ? openEditItem(item)
                                        : openDeleteItemDialog(item)
                                    }
                                    title={item.status === "ativo" ? "Inativar" : "Excluir"}
                                  >
                                    {item.status === "ativo" ? (
                                      <ToggleRight className="h-4 w-4 text-amber-600" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog
        open={planoDialogOpen}
        onOpenChange={(o) => {
          if (!o) setPlanoDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlano ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>
              {editingPlano
                ? "Atualize os dados do plano."
                : "Crie um novo plano de manutenção preventiva."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {planoFormError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {planoFormError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Manutenção Preventiva Geral"
                value={planoForm.nome}
                onChange={(e) => setPlanoForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nível *</Label>
              <Select
                value={planoForm.nivel}
                onValueChange={(v) =>
                  setPlanoForm((p) => ({
                    ...p,
                    nivel: v as "base" | "classificacao" | "modelo",
                    classificacaoId: "",
                    modeloId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base (todos os equipamentos)</SelectItem>
                  <SelectItem value="classificacao">Classificação</SelectItem>
                  <SelectItem value="modelo">Modelo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(planoForm.nivel === "classificacao" || planoForm.nivel === "modelo") && (
              <div className="space-y-2">
                <Label>Classificação *</Label>
                <Select
                  value={planoForm.classificacaoId}
                  onValueChange={(v) =>
                    setPlanoForm((p) => ({ ...p, classificacaoId: v ?? "", modeloId: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classificacoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {planoForm.nivel === "modelo" && (
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Select
                  value={planoForm.modeloId}
                  onValueChange={(v) => setPlanoForm((p) => ({ ...p, modeloId: v ?? "" }))}
                  disabled={!planoForm.classificacaoId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        planoForm.classificacaoId
                          ? "Selecione..."
                          : "Selecione a classificação primeiro"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos
                      .filter(
                        (m) =>
                          (m as unknown as Record<string, string>).classificacaoId ===
                          planoForm.classificacaoId,
                      )
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {planoForm.nivel === "classificacao" && (
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Equipamentos desta classificação também herdam os itens do plano Base.
              </div>
            )}
            {planoForm.nivel === "modelo" && (
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Equipamentos deste modelo também herdam os itens dos planos Base e de Classificação.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlano} disabled={planoSaving}>
              {planoSaving ? "Salvando..." : editingPlano ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemDialogOpen}
        onOpenChange={(o) => {
          if (!o) setItemDialogOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Atualize os dados do item do plano."
                : "Adicione um novo item de manutenção ao plano."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {itemFormError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {itemFormError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Limpeza de filtros"
                value={itemForm.nome}
                onChange={(e) => setItemForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição opcional do item..."
                rows={2}
                value={itemForm.descricao}
                onChange={(e) => setItemForm((p) => ({ ...p, descricao: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Periocidade *</Label>
                <Select
                  value={itemForm.periodicidade}
                  onValueChange={(v) =>
                    setItemForm((p) => ({ ...p, periodicidade: v ?? "mensal" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODICIDADE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Input
                  placeholder="Ex: Elétrica"
                  value={itemForm.categoria}
                  onChange={(e) => setItemForm((p) => ({ ...p, categoria: e.target.value }))}
                />
              </div>
            </div>
            {editingItem && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={itemForm.status}
                  onValueChange={(v) =>
                    setItemForm((p) => ({ ...p, status: (v ?? "ativo") as "ativo" | "inativo" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                {editingItem.status === "ativo" && itemForm.status === "inativo" && (
                  <p className="text-xs text-amber-600">
                    Ao inativar, manutenções programadas ativas usando este item poderão ser
                    afetadas.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={itemSaving}>
              {itemSaving ? "Salvando..." : editingItem ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteItemDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteItemDialogOpen(false);
            setDeletingItem(null);
            setDeleteItemError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item <strong>{deletingItem?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteItemError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {deleteItemError}
            </div>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteItemDialogOpen(false);
                setDeletingItem(null);
                setDeleteItemError(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={deletingItemLoading}>
              {deletingItemLoading ? "Excluindo..." : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={simulateOpen}
        onOpenChange={(o) => {
          if (!o) setSimulateOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Simular Plano Consolidado</DialogTitle>
            <DialogDescription>
              Selecione um equipamento para visualizar todos os itens que ele receberia pela herança
              de planos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Select
                value={simulateEquipamentoId}
                onValueChange={(v) => {
                  setSimulateEquipamentoId(v ?? "");
                  setConsolidado(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um equipamento..." />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.patrimonio} — {eq.modeloNome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSimulate}
              disabled={!simulateEquipamentoId || consolidadoLoading}
              className="w-full gap-1.5"
            >
              <Eye className="h-4 w-4" />
              {consolidadoLoading ? "Carregando..." : "Simular"}
            </Button>
            {consolidado && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Resultado da Simulação</h4>
                  <Badge variant="outline">{consolidado.totalItens} item(ns)</Badge>
                </div>
                {(["base", "classificacao", "modelo"] as const).map((nivel) => {
                  const items = consolidado.porNivel[nivel];
                  if (items.length === 0) return null;
                  return (
                    <div key={nivel}>
                      <h5 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        {(() => {
                          const Ic = NIVEL_CONFIG[nivel].icon;
                          return <Ic className="h-3.5 w-3.5" />;
                        })()}
                        {NIVEL_CONFIG[nivel].label} ({items.length})
                      </h5>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.planoItemId}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{item.nome}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {PERIODICIDADE_LABELS[item.periodicidade]} · {item.categoria}
                              </span>
                            </div>
                            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                              {item.planoManutencaoNome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {consolidado.totalItens === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum item ativo encontrado para este equipamento.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useCrudResource, useSelectResources, type RefItem } from "@/hooks/use-crud-resource";
import { useUser } from "@/components/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type SelectField = {
  key: string;
  label: string;
  apiEndpoint: string;
};

export type CrudColumn = {
  key: string;
  label: string;
  fk?: {
    endpoint: string;
    idKey: string;
  };
};

export type CrudConfig = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  entityName: string;
  apiEndpoint: string;
  columns: CrudColumn[];
  formFields: CrudFormField[];
  selectFields?: SelectField[];
};

export type CrudFormField = {
  key: string;
  label: string;
  type?: "text" | "select";
  maxLength?: number;
  placeholder?: string;
  parentKey?: string;
};

const PAGE_SIZE = 15;

export function CrudPage({ config }: { config: CrudConfig }) {
  const user = useUser();
  const isAdmin = user?.perfil === "admin";
  const Icon = config.icon;

  const { items, loading, create, update, remove } = useCrudResource(config.apiEndpoint);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RefItem | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<RefItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectEndpoints = useMemo(() => {
    const eps = new Set<string>();
    if (config.selectFields) {
      for (const sf of config.selectFields) eps.add(sf.apiEndpoint);
    }
    if (config.columns) {
      for (const col of config.columns) {
        if (col.fk) eps.add(col.fk.endpoint);
      }
    }
    return [...eps];
  }, [config.selectFields, config.columns]);

  const selectMap = useSelectResources(selectEndpoints);

  const fkNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [ep, data] of Object.entries(selectMap)) {
      for (const item of data) {
        map[`${ep}:${item.id}`] = item.nome;
      }
    }
    return map;
  }, [selectMap]);

  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter((item) =>
      Object.values(item).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(search.toLowerCase()),
      ),
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function openCreateDialog() {
    setEditingItem(null);
    setFormError(null);
    const initial: Record<string, string> = {};
    for (const f of config.formFields) initial[f.key] = "";
    setFormValues(initial);
    setDialogOpen(true);
  }

  function openEditDialog(item: RefItem) {
    setEditingItem(item);
    setFormError(null);
    const initial: Record<string, string> = {};
    const raw = item as unknown as Record<string, unknown>;
    for (const f of config.formFields) {
      initial[f.key] = typeof raw[f.key] === "string" ? (raw[f.key] as string) : "";
    }
    setFormValues(initial);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingItem(null);
    setFormValues({});
    setFormError(null);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const body: Record<string, string> = {};
    for (const f of config.formFields) {
      if (formValues[f.key]) body[f.key] = formValues[f.key];
    }

    const result = editingItem ? await update(editingItem.id, body) : await create(body);

    if (result.ok) {
      toast.success(
        editingItem
          ? `${config.entityName} atualizado(a) com sucesso.`
          : `${config.entityName} criado(a) com sucesso.`,
      );
      closeDialog();
    } else {
      setFormError(result.error);
    }
    setSaving(false);
  }

  function openDeleteDialog(item: RefItem) {
    setDeletingItem(item);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await remove(deletingItem.id);
    if (result.ok) {
      toast.success(`${config.entityName} excluído(a) com sucesso.`);
      setDeleteOpen(false);
      setDeletingItem(null);
    } else {
      setDeleteError(result.error);
    }
    setDeleting(false);
  }

  function updateFormField(key: string, value: string) {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      if (config.selectFields) {
        for (const sf of config.selectFields) {
          if (key !== sf.key) continue;
          const field = config.formFields.find((f) => f.key === sf.key);
          if (field?.parentKey) {
            const parentData = selectMap[sf.apiEndpoint] ?? [];
            const selectedParent = parentData.find((p) => p.id === value);
            if (!selectedParent) {
              for (const child of config.selectFields) {
                if (child === sf) continue;
                const childField = config.formFields.find((f) => f.key === child.key);
                if (childField?.parentKey === sf.key) {
                  next[child.key] = "";
                }
              }
            }
          }
        }
      }
      return next;
    });
  }

  function getFilteredOptions(field: CrudFormField): RefItem[] {
    if (field.type !== "select" || !field.parentKey) {
      const sf = config.selectFields?.find((s) => s.key === field.key);
      return sf ? (selectMap[sf.apiEndpoint] ?? []) : [];
    }
    const parentSf = config.selectFields?.find((s) => s.key === field.parentKey);
    if (!parentSf) return [];
    const parentId = formValues[field.parentKey];
    if (!parentId) return [];
    const childSf = config.selectFields?.find((s) => s.key === field.key);
    if (!childSf) return [];
    const allChildren = selectMap[childSf.apiEndpoint] ?? [];
    return allChildren.filter((c) => {
      const fkKey = `${field.parentKey}Id`;
      return (c as unknown as Record<string, string>)[fkKey] === parentId;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Icon className="h-6 w-6 text-blue-600" />
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo(a) {config.entityName}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative max-w-sm">
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
                      {config.columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                      {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={config.columns.length + (isAdmin ? 1 : 0)}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {search
                            ? `Nenhum(a) ${config.entityName.toLowerCase()} encontrado(a) para a busca.`
                            : `Nenhum(a) ${config.entityName.toLowerCase()} cadastrado(a).`}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((item) => (
                        <TableRow key={item.id}>
                          {config.columns.map((col) => (
                            <TableCell key={col.key} className="text-sm">
                              {col.fk
                                ? (fkNameMap[
                                    `${col.fk.endpoint}:${(item as unknown as Record<string, string>)[col.fk.idKey]}`
                                  ] ?? "—")
                                : ((item as unknown as Record<string, unknown>)[
                                    col.key
                                  ] as React.ReactNode)}
                            </TableCell>
                          ))}
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEditDialog(item)}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openDeleteDialog(item)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
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
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Editar ${config.entityName}` : `Novo(a) ${config.entityName}`}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? `Atualize os dados de ${config.entityName.toLowerCase()}.`
                : `Preencha os dados para cadastrar um novo(a) ${config.entityName.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            {config.formFields.map((field) => {
              if (field.type === "select") {
                const options = getFilteredOptions(field);
                return (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Select
                      value={formValues[field.key] ?? ""}
                      onValueChange={(v) => updateFormField(field.key, v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder ?? "Selecione..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    value={formValues[field.key] ?? ""}
                    onChange={(e) => updateFormField(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingItem ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteOpen(false);
            setDeletingItem(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingItem?.nome}</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingItem(null);
                setDeleteError(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

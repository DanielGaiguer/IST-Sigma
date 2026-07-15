"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/components/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  criadoEm: string;
  atualizadoEm: string;
};

const PERFIL_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  tecnico: "bg-sky-100 text-sky-800",
};

const PERFIL_LABELS: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
};

const PAGE_SIZE = 15;

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function UsuariosPage() {
  const user = useUser();
  const isAdmin = user?.perfil === "admin";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Usuario | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSenha, setFormSenha] = useState("");
  const [formPerfil, setFormPerfil] = useState("tecnico");
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const res = await fetch("/api/usuarios");
        if (!cancelled && res.ok) setUsuarios(await res.json());
      } catch {
        if (!cancelled) toast.error("Erro ao carregar usuários.");
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
    if (!search) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [usuarios, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function openCreateDialog() {
    setEditingItem(null);
    setFormNome("");
    setFormEmail("");
    setFormSenha("");
    setFormPerfil("tecnico");
    setDialogOpen(true);
  }

  function openEditDialog(item: Usuario) {
    setEditingItem(item);
    setFormNome(item.nome);
    setFormEmail(item.email);
    setFormSenha("");
    setFormPerfil(item.perfil);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingItem(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        nome: formNome,
        email: formEmail,
        perfil: formPerfil,
      };
      if (formSenha) body.senha = formSenha;

      const url = editingItem ? `/api/usuarios/${editingItem.id}` : "/api/usuarios";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar usuário.");
        return;
      }

      toast.success(
        editingItem ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.",
      );
      closeDialog();
      const refreshRes = await fetch("/api/usuarios");
      if (refreshRes.ok) setUsuarios(await refreshRes.json());
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(item: Usuario) {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/usuarios/${deletingItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao excluir.");
        return;
      }
      toast.success("Usuário excluído com sucesso.");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      const refreshRes = await fetch("/api/usuarios");
      if (refreshRes.ok) setUsuarios(await refreshRes.json());
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setDeleting(false);
    }
  }

  if (!isAdmin) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-blue-600" />
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de usuários do sistema.</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
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
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {search
                            ? "Nenhum usuário encontrado para a busca."
                            : "Nenhum usuário cadastrado."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm font-medium">{u.nome}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={PERFIL_COLORS[u.perfil] ?? ""} variant="outline">
                              {PERFIL_LABELS[u.perfil] ?? u.perfil}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(u.criadoEm)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditDialog(u)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openDeleteDialog(u)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
                    {filtered.length} usuário(s) — Página {page + 1} de {totalPages}
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
            <DialogTitle>{editingItem ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Atualize os dados do usuário."
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{editingItem ? "Nova Senha (deixe em branco para manter)" : "Senha *"}</Label>
              <Input
                type="password"
                placeholder={editingItem ? "••••••" : "Mínimo 6 caracteres"}
                value={formSenha}
                onChange={(e) => setFormSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={formPerfil} onValueChange={(v) => setFormPerfil(v ?? "tecnico")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
        open={deleteDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteDialogOpen(false);
            setDeletingItem(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário &quot;{deletingItem?.nome}&quot;? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingItem(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

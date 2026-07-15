"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PendingItem } from "@/lib/queries";

const PAGE_SIZE = 10;

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ item }: { item: PendingItem }) {
  if (item.diasAtraso > 0) {
    return <Badge variant="destructive">{item.diasAtraso}d atraso</Badge>;
  }
  if (item.diasRestantes <= 3) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        {item.diasRestantes}d restantes
      </Badge>
    );
  }
  return <Badge variant="secondary">{item.diasRestantes}d restantes</Badge>;
}

export function PendingTable({ items }: { items: PendingItem[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patrimônio</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Laboratório</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Próxima manutenção</TableHead>
              <TableHead className="text-center">Dias</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma pendência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => (
                <TableRow key={item.id} className={item.diasAtraso > 0 ? "bg-red-50/50" : ""}>
                  <TableCell className="font-mono text-xs">{item.patrimonio}</TableCell>
                  <TableCell>
                    <Link
                      href={`/equipamentos/${item.equipamentoId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {item.nomeEquipamento}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{item.laboratorio}</TableCell>
                  <TableCell className="text-sm">{item.classificacao}</TableCell>
                  <TableCell className="text-sm">{formatDate(item.dataPrevista)}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge item={item} />
                  </TableCell>
                  <TableCell>
                    {item.diasAtraso > 0 ? (
                      <Badge variant="destructive">Atrasada</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {items.length} pendência(s) — Página {page + 1} de {totalPages}
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
    </div>
  );
}

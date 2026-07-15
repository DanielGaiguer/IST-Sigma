"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export type RefItem = { id: string; nome: string };

export function useCrudResource(endpoint: string) {
  const [items, setItems] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (res.ok) setItems(await res.json());
    } catch {
      toast.error("Erro ao carregar dados.");
    }
  }, [endpoint]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const res = await fetch(endpoint);
        if (!cancelled && res.ok) setItems(await res.json());
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
  }, [endpoint]);

  const create = useCallback(
    async (data: Record<string, string>) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return { ok: false as const, error: err.error || "Erro ao criar." };
      }
      await refetch();
      return { ok: true as const };
    },
    [endpoint, refetch],
  );

  const update = useCallback(
    async (id: string, data: Record<string, string>) => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        return { ok: false as const, error: err.error || "Erro ao atualizar." };
      }
      await refetch();
      return { ok: true as const };
    },
    [endpoint, refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        return { ok: false as const, error: err.error || "Erro ao excluir." };
      }
      await refetch();
      return { ok: true as const };
    },
    [endpoint, refetch],
  );

  return { items, loading, refetch, create, update, remove };
}

export function useSelectResources(endpoints: string[]) {
  const key = endpoints.join(",");
  const [map, setMap] = useState<Record<string, RefItem[]>>({});

  useEffect(() => {
    if (endpoints.length === 0) return;
    let cancelled = false;
    Promise.all(
      endpoints.map(async (ep) => {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const data = await res.json();
            return { ep, data };
          }
        } catch {
          // silent
        }
        return { ep, data: [] as RefItem[] };
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, RefItem[]> = {};
      for (const r of results) next[r.ep] = r.data;
      setMap(next);
    });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` is derived from `endpoints`

  return map;
}

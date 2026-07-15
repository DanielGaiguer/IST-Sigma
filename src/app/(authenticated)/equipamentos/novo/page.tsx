"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Wrench } from "lucide-react";
import { useUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  patrimonio: z.string().regex(/^\d{6}$/, "Patrimônio deve ter exatamente 6 dígitos numéricos."),
  numeroSerie: z.string().min(1, "Número de série é obrigatório.").max(100),
  fabricanteId: z.string().min(1, "Fabricante é obrigatório."),
  modeloId: z.string().min(1, "Modelo é obrigatório."),
  tipoEquipamentoId: z.string().min(1, "Tipo é obrigatório."),
  classificacaoId: z.string().min(1, "Classificação é obrigatória."),
  unidadeId: z.string().min(1, "Unidade é obrigatória."),
  laboratorioId: z.string().min(1, "Laboratório é obrigatório."),
  situacao: z.enum(["ativo", "fora_de_uso", "em_manutencao", "descartado"]).optional(),
});

type FormData = z.infer<typeof schema>;

type RefItem = { id: string; nome: string };
type ModeloItem = RefItem & { fabricanteId: string };
type ClassificacaoItem = RefItem & { tipoEquipamentoId: string };
type LaboratorioItem = RefItem & { unidadeId: string };

const SITUACAO_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "fora_de_uso", label: "Fora de Uso" },
  { value: "em_manutencao", label: "Em Manutenção" },
  { value: "descartado", label: "Descartado" },
] as const;

export default function NovoEquipamentoPage() {
  const router = useRouter();
  const user = useUser();

  const [saving, setSaving] = useState(false);
  const [fabricantes, setFabricantes] = useState<RefItem[]>([]);
  const [modelosAll, setModelosAll] = useState<ModeloItem[]>([]);
  const [tipos, setTipos] = useState<RefItem[]>([]);
  const [classificacoesAll, setClassificacoesAll] = useState<ClassificacaoItem[]>([]);
  const [unidades, setUnidades] = useState<RefItem[]>([]);
  const [laboratoriosAll, setLaboratoriosAll] = useState<LaboratorioItem[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      patrimonio: "",
      numeroSerie: "",
      fabricanteId: "",
      modeloId: "",
      tipoEquipamentoId: "",
      classificacaoId: "",
      unidadeId: "",
      laboratorioId: "",
      situacao: "ativo",
    },
  });

  const watchFabricante = form.watch("fabricanteId");
  const watchTipo = form.watch("tipoEquipamentoId");
  const watchUnidade = form.watch("unidadeId");

  const modelos = useMemo(
    () => (watchFabricante ? modelosAll.filter((m) => m.fabricanteId === watchFabricante) : []),
    [modelosAll, watchFabricante],
  );

  const classificacoes = useMemo(
    () => (watchTipo ? classificacoesAll.filter((c) => c.tipoEquipamentoId === watchTipo) : []),
    [classificacoesAll, watchTipo],
  );

  const laboratorios = useMemo(
    () => (watchUnidade ? laboratoriosAll.filter((l) => l.unidadeId === watchUnidade) : []),
    [laboratoriosAll, watchUnidade],
  );

  useEffect(() => {
    async function load() {
      const [fabRes, modRes, tipRes, clsRes, uniRes, labRes] = await Promise.all([
        fetch("/api/fabricantes"),
        fetch("/api/modelos"),
        fetch("/api/tipos-equipamento"),
        fetch("/api/classificacoes"),
        fetch("/api/unidades"),
        fetch("/api/laboratorios"),
      ]);
      if (fabRes.ok) setFabricantes(await fabRes.json());
      if (modRes.ok) setModelosAll(await modRes.json());
      if (tipRes.ok) setTipos(await tipRes.json());
      if (clsRes.ok) setClassificacoesAll(await clsRes.json());
      if (uniRes.ok) setUnidades(await uniRes.json());
      if (labRes.ok) setLaboratoriosAll(await labRes.json());
    }
    load();
  }, []);

  useEffect(() => {
    form.setValue("modeloId", "");
  }, [watchFabricante, form]);

  useEffect(() => {
    form.setValue("classificacaoId", "");
  }, [watchTipo, form]);

  useEffect(() => {
    form.setValue("laboratorioId", "");
  }, [watchUnidade, form]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/equipamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar equipamento.");
        return;
      }

      const created = await res.json();
      toast.success(
        "Equipamento criado com sucesso! As manutenções preventivas foram geradas automaticamente.",
      );
      router.push(`/equipamentos/${created.id}`);
    } catch {
      toast.error("Erro de conexão ao criar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  if (user?.perfil !== "admin") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
          <Button variant="outline" className="mt-3" onClick={() => router.push("/equipamentos")}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/equipamentos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wrench className="h-6 w-6 text-blue-600" />
            Novo Equipamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados para cadastrar um novo equipamento.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="patrimonio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patrimônio *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 123456" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numeroSerie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Série *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: NS-00123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="situacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Situação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "ativo"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SITUACAO_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fabricanteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fabricante *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fabricantes.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modeloId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchFabricante}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                watchFabricante ? "Selecione..." : "Selecione o fabricante primeiro"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {modelos.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipoEquipamentoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Equipamento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tipos.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="classificacaoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classificação *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchTipo}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={watchTipo ? "Selecione..." : "Selecione o tipo primeiro"}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classificacoes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unidadeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unidades.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="laboratorioId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Laboratório *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!watchUnidade}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                watchUnidade ? "Selecione..." : "Selecione a unidade primeiro"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {laboratorios.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/equipamentos")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

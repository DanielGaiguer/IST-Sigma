import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench, Building2, Factory, Tag, Calendar, ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServerSession } from "@/lib/auth";

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

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function getEquipamento(id: string) {
  try {
    const res = await fetch(
      `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/equipamentos/${id}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function getPlanoConsolidado(equipamentoId: string) {
  try {
    const res = await fetch(
      `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/planos-manutencao/consolidado/${equipamentoId}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

export default async function EquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  const isAdmin = session?.user?.perfil === "admin";

  const [equipamento, planoConsolidado] = await Promise.all([
    getEquipamento(id),
    getPlanoConsolidado(id),
  ]);

  if (!equipamento) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/equipamentos" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Wrench className="h-6 w-6 text-blue-600" />
              {equipamento.patrimonio}
            </h1>
            <p className="text-sm text-muted-foreground">
              {equipamento.numeroSerie} — {equipamento.modeloNome}
            </p>
          </div>
        </div>
        {isAdmin && equipamento.situacao !== "descartado" && (
          <Button variant="outline" size="sm" render={<Link href={`/equipamentos/${id}/editar`} />}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              Patrimônio
            </div>
            <p className="mt-1 font-mono text-lg font-bold">{equipamento.patrimonio}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Laboratório
            </div>
            <p className="mt-1 font-medium">{equipamento.laboratorioNome}</p>
            <p className="text-xs text-muted-foreground">{equipamento.unidadeNome}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Factory className="h-4 w-4" />
              Fabricante / Modelo
            </div>
            <p className="mt-1 font-medium">{equipamento.fabricanteNome}</p>
            <p className="text-xs text-muted-foreground">{equipamento.modeloNome}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Situação
            </div>
            <Badge
              className={`mt-1 ${SITUACAO_COLORS[equipamento.situacao] ?? ""}`}
              variant="outline"
            >
              {SITUACAO_LABELS[equipamento.situacao] ?? equipamento.situacao}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programadas">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="programadas">
            Programadas ({equipamento.manutencoesProgramadas?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="historico">
            Histórico ({equipamento.historico?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="consolidado">Plano Consolidado</TabsTrigger>
        </TabsList>

        <TabsContent value="programadas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manutenções Programadas</CardTitle>
            </CardHeader>
            <CardContent>
              {!equipamento.manutencoesProgramadas ||
              equipamento.manutencoesProgramadas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma manutenção programada para este equipamento.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atividade</TableHead>
                        <TableHead>Periodicidade</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data Prevista</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipamento.manutencoesProgramadas.map((m: Record<string, unknown>) => (
                        <TableRow key={m.id as string}>
                          <TableCell className="font-medium">{m.planoItemNome as string}</TableCell>
                          <TableCell className="text-sm">
                            {m.planoItemPeriodicidade as string}
                          </TableCell>
                          <TableCell className="text-sm">
                            {m.planoItemCategoria as string}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(m.dataPrevista as string)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.status === "pendente" ? "destructive" : "secondary"}>
                              {m.status === "programada"
                                ? "Programada"
                                : m.status === "pendente"
                                  ? "Pendente"
                                  : String(m.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Manutenções</CardTitle>
            </CardHeader>
            <CardContent>
              {equipamento.resumoHistorico && (
                <div className="mb-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {equipamento.resumoHistorico.totalRegistros}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {equipamento.resumoHistorico.totalConcluidas}
                    </p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {equipamento.resumoHistorico.totalAtrasadas}
                    </p>
                    <p className="text-xs text-muted-foreground">Atrasadas</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {equipamento.resumoHistorico.mediaDiasAtraso}d
                    </p>
                    <p className="text-xs text-muted-foreground">Média Atraso</p>
                  </div>
                </div>
              )}
              {!equipamento.historico || equipamento.historico.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro de histórico para este equipamento.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atividade</TableHead>
                        <TableHead>Data Prevista</TableHead>
                        <TableHead>Data Executada</TableHead>
                        <TableHead>Dias de Atraso</TableHead>
                        <TableHead>Próxima</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipamento.historico.map((h: Record<string, unknown>) => (
                        <TableRow key={h.id as string}>
                          <TableCell className="font-medium">{h.planoItemNome as string}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(h.dataPrevista as string)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(h.dataExecutada as string | null)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(h.diasAtraso as number) > 0 ? (
                              <Badge variant="destructive">{h.diasAtraso as number}d</Badge>
                            ) : (
                              <span className="text-muted-foreground">0d</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(h.dataProximaManutencao as string | null)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={h.status === "concluida" ? "default" : "secondary"}>
                              {h.status === "concluida" ? "Concluída" : String(h.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consolidado">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plano Consolidado</CardTitle>
            </CardHeader>
            <CardContent>
              {!planoConsolidado || planoConsolidado.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum plano de manutenção aplicável a este equipamento.
                </p>
              ) : (
                <div className="space-y-4">
                  {(["base", "classificacao", "modelo"] as const).map((nivel) => {
                    const items = planoConsolidado.filter(
                      (item: Record<string, unknown>) => item.nivel === nivel,
                    );
                    if (items.length === 0) return null;
                    const nivelLabel =
                      nivel === "base"
                        ? "Plano Base"
                        : nivel === "classificacao"
                          ? "Plano da Classificação"
                          : "Plano do Modelo";
                    return (
                      <div key={nivel}>
                        <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                          {nivelLabel}
                        </h4>
                        <div className="overflow-x-auto rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Atividade</TableHead>
                                <TableHead>Periodicidade</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Plano</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: Record<string, unknown>) => (
                                <TableRow key={item.planoItemId as string}>
                                  <TableCell className="font-medium">
                                    {item.nome as string}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {item.periodicidade as string}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {item.categoria as string}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {item.planoManutencaoNome as string}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

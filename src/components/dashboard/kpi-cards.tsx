import {
  HardDrive,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  AlertOctagon,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardKPI } from "@/lib/queries";

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-200 bg-amber-50/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-amber-700" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function KPICards({ data }: { data: DashboardKPI }) {
  const cards = [
    {
      title: "Total de Equipamentos",
      value: data.totalEquipamentos,
      icon: HardDrive,
      color: "text-blue-600",
    },
    {
      title: "Preventivas Pendentes",
      value: data.pendentes,
      icon: AlertTriangle,
      color: "text-amber-600",
      highlight: data.pendentes > 0,
    },
    {
      title: "Vencendo em 7 dias",
      value: data.vencendoEm7Dias,
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: "Preventivas deste mês",
      value: data.desteMes,
      icon: Calendar,
      color: "text-blue-500",
    },
  ];

  const cardsRow2 = [
    {
      title: "Realizadas no mês",
      value: data.realizadasNoMes,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      title: "Equipamentos Críticos",
      value: data.criticos,
      icon: AlertOctagon,
      color: "text-red-600",
      highlight: data.criticos > 0,
    },
    {
      title: "Tempo médio de atraso",
      value: `${data.tempoMedioAtraso}d`,
      icon: Timer,
      color: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <KPICard key={c.title} {...c} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cardsRow2.map((c) => (
          <KPICard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}

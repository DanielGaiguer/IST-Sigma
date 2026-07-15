"use client";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PieLabelRenderProps } from "recharts";
import type {
  MonthlyCompleted,
  ClassificationDist,
  StatusDist,
  LabBreakdown,
  ManufacturerDist,
  MonthlyAvgDelay,
} from "@/lib/queries";

const BLUE = "#2563eb";
const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

const STATUS_LABELS: Record<string, string> = {
  programada: "Programada",
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  programada: "#2563eb",
  pendente: "#f59e0b",
  em_andamento: "#f97316",
  concluida: "#10b981",
  cancelada: "#94a3b8",
};

function pieLabel(props: PieLabelRenderProps) {
  const name = String(props.name ?? "");
  const pct = Number(props.percent ?? 0);
  return `${name} (${(pct * 100).toFixed(0)}%)`;
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CompletedByMonthChart({ data }: { data: MonthlyCompleted[] }) {
  return (
    <ChartCard title="Preventivas realizadas por mês (últimos 12 meses)">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="quantidade"
          stroke={BLUE}
          strokeWidth={2}
          name="Realizadas"
        />
      </LineChart>
    </ChartCard>
  );
}

export function ClassificationPieChart({ data }: { data: ClassificationDist[] }) {
  return (
    <ChartCard title="Equipamentos por classificação">
      <PieChart>
        <Pie
          data={data}
          dataKey="quantidade"
          nameKey="nome"
          cx="50%"
          cy="50%"
          outerRadius={60}
          label={pieLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}

export function StatusDonutChart({ data }: { data: StatusDist[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  return (
    <ChartCard title="Status das preventivas">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="quantidade"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={60}
          label={pieLabel}
          labelLine={false}
        >
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}

export function LabBarChart({ data }: { data: LabBreakdown[] }) {
  return (
    <ChartCard title="Preventivas por laboratório">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="laboratorio" width={80} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="quantidade" fill={BLUE} radius={[0, 4, 4, 0]} name="Preventivas" />
      </BarChart>
    </ChartCard>
  );
}

export function ManufacturerPieChart({ data }: { data: ManufacturerDist[] }) {
  return (
    <ChartCard title="Equipamentos por fabricante">
      <PieChart>
        <Pie
          data={data}
          dataKey="quantidade"
          nameKey="nome"
          cx="50%"
          cy="50%"
          outerRadius={60}
          label={pieLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}

export function AvgDelayLineChart({ data }: { data: MonthlyAvgDelay[] }) {
  return (
    <ChartCard title="Tempo médio de atraso por mês">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="mediaDias"
          stroke="#ef4444"
          strokeWidth={2}
          name="Dias médios"
        />
      </LineChart>
    </ChartCard>
  );
}

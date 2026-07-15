import {
  getDashboardKPI,
  getOverdueAlerts,
  getMonthlyCompleted,
  getClassificationDist,
  getStatusDist,
  getLabBreakdown,
  getManufacturerDist,
  getMonthlyAvgDelay,
  getPendingItems,
} from "@/lib/queries";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { AlertsBanner } from "@/components/dashboard/alerts-banner";
import {
  CompletedByMonthChart,
  ClassificationPieChart,
  StatusDonutChart,
  LabBarChart,
  ManufacturerPieChart,
  AvgDelayLineChart,
} from "@/components/dashboard/charts";
import { PendingTable } from "@/components/dashboard/pending-table";

export default async function DashboardPage() {
  const [
    kpi,
    alerts,
    monthlyCompleted,
    classificationDist,
    statusDist,
    labBreakdown,
    manufacturerDist,
    monthlyAvgDelay,
    pendingItems,
  ] = await Promise.all([
    getDashboardKPI(),
    getOverdueAlerts(),
    getMonthlyCompleted(),
    getClassificationDist(),
    getStatusDist(),
    getLabBreakdown(),
    getManufacturerDist(),
    getMonthlyAvgDelay(),
    getPendingItems(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do sistema de manutenção preventiva.
        </p>
      </div>

      <KPICards data={kpi} />

      <AlertsBanner alerts={alerts} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CompletedByMonthChart data={monthlyCompleted} />
        <ClassificationPieChart data={classificationDist} />
        <StatusDonutChart data={statusDist} />
        <LabBarChart data={labBreakdown} />
        <ManufacturerPieChart data={manufacturerDist} />
        <AvgDelayLineChart data={monthlyAvgDelay} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Lista de Pendências</h2>
        <PendingTable items={pendingItems} />
      </div>
    </div>
  );
}

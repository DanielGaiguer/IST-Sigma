import { CalendarCheck } from "lucide-react";
import { AgendaList } from "@/components/agenda/agenda-list";

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CalendarCheck className="h-6 w-6 text-blue-600" />
          Agenda do Dia
        </h1>
        <p className="text-sm text-muted-foreground">
          Manutenções programadas para hoje, agrupadas por equipamento.
        </p>
      </div>
      <AgendaList />
    </div>
  );
}

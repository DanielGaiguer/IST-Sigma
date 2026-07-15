"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Wrench,
  ClipboardList,
  History,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Settings,
  Landmark,
  Factory,
  Cpu,
  Tag,
  Puzzle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useUser } from "@/components/user-context";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Agenda do Dia", icon: CalendarCheck, href: "/agenda" },
  { label: "Equipamentos", icon: Wrench, href: "/equipamentos" },
  { label: "Planos de Manutenção", icon: ClipboardList, href: "/planos-manutencao" },
  { label: "Histórico", icon: History, href: "/historico" },
] as const;

const CADASTRO_ITEMS = [
  { label: "Unidades", icon: Landmark, href: "/cadastros/unidades" },
  { label: "Laboratórios", icon: FlaskConical, href: "/cadastros/laboratorios" },
  { label: "Fabricantes", icon: Factory, href: "/cadastros/fabricantes" },
  { label: "Tipos de Equipamento", icon: Cpu, href: "/cadastros/tipos-equipamento" },
  { label: "Classificações", icon: Tag, href: "/cadastros/classificacoes" },
  { label: "Modelos", icon: Puzzle, href: "/cadastros/modelos" },
] as const;

const ADMIN_ITEMS = [
  { label: "Auditoria", icon: ShieldCheck, href: "/admin/auditoria" },
  { label: "Usuários", icon: Users, href: "/admin/usuarios" },
] as const;

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { label: string; icon: React.ComponentType<{ className?: string }>; href: string };
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function CadastroItems({ items, collapsed }: { items: typeof CADASTRO_ITEMS; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = items.some((i) => pathname === i.href);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>
          <Link
            href="/cadastros/unidades"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Cadastros</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive || open
            ? "bg-blue-50 text-blue-700"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Settings className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Cadastros</span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </button>
      {open && (
        <div className="ml-4 mt-0.5 border-l pl-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onMouseEnter,
  onMouseLeave,
}: {
  collapsed: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const pathname = usePathname();
  const user = useUser();
  const isAdmin = user?.perfil === "admin";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-all duration-200 lg:flex ${
        collapsed ? "w-16" : "w-64"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`flex h-14 items-center border-b ${collapsed ? "justify-center px-2" : "gap-2.5 px-4"}`}
      >
        <img src="/icon-150x150.png" alt="IST Sigma" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        {!collapsed && <span className="text-base font-bold tracking-tight">IST Sigma</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        <div className="py-1.5">
          <Separator />
        </div>

        <CadastroItems items={CADASTRO_ITEMS} collapsed={collapsed} />

        {isAdmin && (
          <>
            <div className="py-1.5">
              <Separator />
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                active={pathname === item.href}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

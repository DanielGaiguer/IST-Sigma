"use client";

import { signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import { useUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useState } from "react";

export function Header({ collapsed }: { collapsed: boolean }) {
  const user = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={`fixed top-0 right-0 left-0 z-40 flex h-14 items-center border-b bg-card px-4 transition-all duration-200 ${collapsed ? "lg:left-16" : "lg:left-64"}`}>
      <div className="flex lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Abrir menu" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-64 p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <Sidebar collapsed={false} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{user?.nome}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Badge variant={user?.perfil === "admin" ? "default" : "secondary"}>
            {user?.perfil === "admin" ? "Admin" : "Técnico"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

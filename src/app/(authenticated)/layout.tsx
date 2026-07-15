import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { UserProvider } from "@/components/user-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/shell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    nome: session.user.nome,
    email: session.user.email,
    perfil: session.user.perfil,
  };

  return (
    <TooltipProvider>
      <UserProvider user={user}>
        <Shell>{children}</Shell>
      </UserProvider>
    </TooltipProvider>
  );
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuario, type Perfil } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nome: string;
      email: string;
      perfil: Perfil;
    };
  }

  interface User {
    id: string;
    nome: string;
    email: string;
    perfil: Perfil;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nome: string;
    email: string;
    perfil: Perfil;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null;
        }

        const [user] = await db
          .select()
          .from(usuario)
          .where(eq(usuario.email, credentials.email as string))
          .limit(1);

        if (!user) {
          return null;
        }

        const senhaValida = await bcrypt.compare(credentials.senha as string, user.senhaHash);

        if (!senhaValida) {
          return null;
        }

        return {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil as Perfil,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nome = user.nome;
        token.email = user.email;
        token.perfil = user.perfil;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.nome = token.nome;
      session.user.email = token.email;
      session.user.perfil = token.perfil;
      return session;
    },
  },
});

/**
 * Obtém a sessão do usuário autenticado no contexto de Server Components
 * e Route Handlers (API routes).
 *
 * Retorna null se não houver sessão válida.
 *
 * Uso:
 *   const session = await getServerSession();
 *   if (!session) { ... }
 *   const userId = session.user.id;
 */
export async function getServerSession() {
  return auth();
}

/**
 * Verifica se o usuário tem perfil "admin".
 * Lança erro 403 se não tiver.
 *
 * Uso nas rotas:
 *   const session = await requireAdmin();
 */
export async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  if (session.user.perfil !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Verifica se o usuário está autenticado (qualquer perfil).
 * Lança erro 401 se não tiver sessão.
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

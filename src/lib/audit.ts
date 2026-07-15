import { db } from "@/db";
import { auditoria } from "@/db/schema";

/**
 * Registra uma operação de auditoria.
 *
 * TODO: integrar com sessão autenticada para obter o usuarioId
 * automaticamente (ex: getServerSession() ou cookies).
 * Por enquanto, o usuarioId é recebido como parâmetro.
 *
 * @param operacao Tipo da operação: "INSERT", "UPDATE" ou "DELETE".
 * @param entidade Nome da tabela afetada (ex: "unidade", "laboratorio").
 * @param registroId ID do registro afetado.
 * @param valorAnterior Estado anterior (para UPDATE/DELETE).
 * @param valorNovo Estado novo (para INSERT/UPDATE).
 * @param usuarioId ID do usuário que realizou a operação.
 */
export async function registrarAuditoria(params: {
  operacao: "INSERT" | "UPDATE" | "DELETE";
  entidade: string;
  registroId: string;
  valorAnterior?: Record<string, unknown>;
  valorNovo?: Record<string, unknown>;
  usuarioId: string;
}) {
  await db.insert(auditoria).values({
    usuarioId: params.usuarioId,
    operacao: params.operacao,
    entidade: params.entidade,
    registroId: params.registroId,
    valorAnterior: params.valorAnterior ?? null,
    valorNovo: params.valorNovo ?? null,
  });
}

import { z } from "zod";

// ─── UUID helper ──────────────────────────────────────────────────────────────

const uuid = z.string().uuid("ID inválido — esperado UUID v4.");

// ─── Unidade ─────────────────────────────────────────────────────────────────

export const criarUnidadeSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
});

export const editarUnidadeSchema = criarUnidadeSchema.partial();

// ─── Laboratório ─────────────────────────────────────────────────────────────

export const criarLaboratorioSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  unidadeId: uuid,
});

export const editarLaboratorioSchema = criarLaboratorioSchema.partial();

// ─── Fabricante ──────────────────────────────────────────────────────────────

export const criarFabricanteSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
});

export const editarFabricanteSchema = criarFabricanteSchema.partial();

// ─── Tipo de Equipamento ─────────────────────────────────────────────────────

export const criarTipoEquipamentoSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
});

export const editarTipoEquipamentoSchema = criarTipoEquipamentoSchema.partial();

// ─── Classificação ───────────────────────────────────────────────────────────

export const criarClassificacaoSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  tipoEquipamentoId: uuid,
});

export const editarClassificacaoSchema = criarClassificacaoSchema.partial();

// ─── Modelo ──────────────────────────────────────────────────────────────────

export const criarModeloSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  fabricanteId: uuid,
  classificacaoId: uuid,
});

export const editarModeloSchema = criarModeloSchema.partial();

// ─── Equipamento ────────────────────────────────────────────────────────────

export const criarEquipamentoSchema = z.object({
  patrimonio: z.string().regex(/^\d{6}$/, "Patrimônio deve ter exatamente 6 dígitos numéricos."),
  numeroSerie: z
    .string()
    .min(1, "Número de série é obrigatório.")
    .max(100, "Número de série deve ter no máximo 100 caracteres."),
  fabricanteId: uuid,
  modeloId: uuid,
  tipoEquipamentoId: uuid,
  classificacaoId: uuid,
  unidadeId: uuid,
  laboratorioId: uuid,
  situacao: z.enum(["ativo", "fora_de_uso", "em_manutencao", "descartado"]).optional(),
});

export const editarEquipamentoSchema = criarEquipamentoSchema.partial();

// ─── Plano de Manutenção ───────────────────────────────────────────────────

/**
 * Validação do nível (refinada nas rotas):
 *  - "base":       classificacaoId=NULL, modeloId=NULL
 *  - "classificação": classificacaoId obrigatório, modeloId=NULL
 *  - "modelo":     classificacaoId + modeloId obrigatórios
 *
 * A validação condicional é feita nas rotas (POST/PUT) porque Zod .refine()
 * é incompatível com .partial() no schema de edição.
 */
export const criarPlanoManutencaoSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  nivel: z.enum(["base", "classificacao", "modelo"]),
  classificacaoId: uuid.nullable().optional(),
  modeloId: uuid.nullable().optional(),
});

export const editarPlanoManutencaoSchema = criarPlanoManutencaoSchema.partial();

// ─── Plano Item ─────────────────────────────────────────────────────────────

export const criarPlanoItemSchema = z.object({
  planoManutencaoId: uuid,
  nome: z
    .string()
    .min(1, "Nome é obrigatório.")
    .max(200, "Nome deve ter no máximo 200 caracteres."),
  descricao: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres.")
    .nullable()
    .optional(),
  periodicidade: z.enum([
    "diario",
    "semanal",
    "quinzenal",
    "mensal",
    "trimestral",
    "semestral",
    "anual",
  ]),
  categoria: z
    .string()
    .min(1, "Categoria é obrigatória.")
    .max(100, "Categoria deve ter no máximo 100 caracteres."),
  status: z.enum(["ativo", "inativo"]).optional(),
});

export const editarPlanoItemSchema = criarPlanoItemSchema.partial();

// ─── Manutenção Programada ─────────────────────────────────────────────────

export const criarManutencaoProgramadaSchema = z.object({
  equipamentoId: uuid,
  planoItemId: uuid,
  dataPrevista: z.coerce.date({ message: "Data prevista é obrigatória." }),
});

export const editarManutencaoProgramadaSchema = z.object({
  dataPrevista: z.coerce.date().optional(),
  status: z.enum(["programada", "pendente", "em_andamento", "concluida", "cancelada"]).optional(),
});

export const concluirManutencaoSchema = z.object({
  dataExecutada: z.coerce.date({ message: "Data executada é obrigatória." }),
  responsavelId: uuid,
  observacoes: z.string().max(1000, "Observações deve ter no máximo 1000 caracteres.").optional(),
});

export const cancelarManutencaoSchema = z.object({
  motivo: z
    .string()
    .min(1, "Motivo do cancelamento é obrigatório.")
    .max(1000, "Motivo deve ter no máximo 1000 caracteres."),
});

// ─── Audit helper (usuarioId) ────────────────────────────────────────────────

export const auditoriaSchema = z.object({
  // TODO: substituir por sessão autenticada (ex: getServerSession())
  usuarioId: uuid,
});

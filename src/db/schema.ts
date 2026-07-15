import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const perfilEnum = pgEnum("perfil", ["admin", "tecnico"]);

export const situacaoEquipamentoEnum = pgEnum("situacao_equipamento", [
  "ativo",
  "fora_de_uso",
  "em_manutencao",
  "descartado",
]);

export const nivelPlanoEnum = pgEnum("nivel_plano", ["base", "classificacao", "modelo"]);

export const statusManutencaoEnum = pgEnum("status_manutencao", [
  "programada",
  "pendente",
  "em_andamento",
  "concluida",
  "cancelada",
]);

export const statusPlanoItemEnum = pgEnum("status_plano_item", ["ativo", "inativo"]);

export const periodicidadeEnum = pgEnum("periodicidade", [
  "diario",
  "semanal",
  "quinzenal",
  "mensal",
  "trimestral",
  "semestral",
  "anual",
]);

// ─── Enum Types ───────────────────────────────────────────────────────────────

export type Perfil = "admin" | "tecnico";
export type SituacaoEquipamento = "ativo" | "fora_de_uso" | "em_manutencao" | "descartado";
export type NivelPlano = "base" | "classificacao" | "modelo";
export type StatusManutencao =
  "programada" | "pendente" | "em_andamento" | "concluida" | "cancelada";
export type StatusPlanoItem = "ativo" | "inativo";
export type Periodicidade =
  "diario" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral" | "anual";

// ─── Tables ───────────────────────────────────────────────────────────────────

// Usuário
export const usuario = pgTable("usuario", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  perfil: perfilEnum("perfil").notNull().default("tecnico"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Unidade
export const unidade = pgTable("unidade", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Laboratório
export const laboratorio = pgTable("laboratorio", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  unidadeId: uuid("unidade_id")
    .notNull()
    .references(() => unidade.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Fabricante
export const fabricante = pgTable("fabricante", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Tipo de Equipamento
export const tipoEquipamento = pgTable("tipo_equipamento", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Classificação (filha de Tipo)
export const classificacao = pgTable("classificacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  tipoEquipamentoId: uuid("tipo_equipamento_id")
    .notNull()
    .references(() => tipoEquipamento.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Modelo (filha de Fabricante + Classificação)
export const modelo = pgTable("modelo", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  fabricanteId: uuid("fabricante_id")
    .notNull()
    .references(() => fabricante.id, { onDelete: "restrict" }),
  classificacaoId: uuid("classificacao_id")
    .notNull()
    .references(() => classificacao.id, { onDelete: "restrict" }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Equipamento
export const equipamento = pgTable("equipamento", {
  id: uuid("id").defaultRandom().primaryKey(),
  patrimonio: text("patrimonio").notNull().unique(),
  numeroSerie: text("numero_serie").notNull(),
  fabricanteId: uuid("fabricante_id")
    .notNull()
    .references(() => fabricante.id, { onDelete: "restrict" }),
  modeloId: uuid("modelo_id")
    .notNull()
    .references(() => modelo.id, { onDelete: "restrict" }),
  tipoEquipamentoId: uuid("tipo_equipamento_id")
    .notNull()
    .references(() => tipoEquipamento.id, { onDelete: "restrict" }),
  classificacaoId: uuid("classificacao_id")
    .notNull()
    .references(() => classificacao.id, { onDelete: "restrict" }),
  unidadeId: uuid("unidade_id")
    .notNull()
    .references(() => unidade.id, { onDelete: "restrict" }),
  laboratorioId: uuid("laboratorio_id")
    .notNull()
    .references(() => laboratorio.id, { onDelete: "restrict" }),
  dataCadastro: timestamp("data_cadastro").defaultNow().notNull(),
  situacao: situacaoEquipamentoEnum("situacao").notNull().default("ativo"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Plano de Manutenção (mestre com herança em 3 níveis)
export const planoManutencao = pgTable("plano_manutencao", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  nivel: nivelPlanoEnum("nivel").notNull(),
  classificacaoId: uuid("classificacao_id").references(() => classificacao.id, {
    onDelete: "restrict",
  }),
  modeloId: uuid("modelo_id").references(() => modelo.id, {
    onDelete: "restrict",
  }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Itens do Plano de Manutenção
export const planoItem = pgTable("plano_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  planoManutencaoId: uuid("plano_manutencao_id")
    .notNull()
    .references(() => planoManutencao.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  periodicidade: periodicidadeEnum("periodicidade").notNull(),
  categoria: text("categoria").notNull(),
  status: statusPlanoItemEnum("status").notNull().default("ativo"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Manutenção Programada
export const manutencaoProgramada = pgTable("manutencao_programada", {
  id: uuid("id").defaultRandom().primaryKey(),
  equipamentoId: uuid("equipamento_id")
    .notNull()
    .references(() => equipamento.id, { onDelete: "cascade" }),
  planoItemId: uuid("plano_item_id")
    .notNull()
    .references(() => planoItem.id, { onDelete: "restrict" }),
  dataPrevista: timestamp("data_prevista").notNull(),
  status: statusManutencaoEnum("status").notNull().default("programada"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Histórico de Manutenção
export const historicoManutencao = pgTable("historico_manutencao", {
  id: uuid("id").defaultRandom().primaryKey(),
  manutencaoProgramadaId: uuid("manutencao_programada_id").references(
    () => manutencaoProgramada.id,
    { onDelete: "set null" },
  ),
  equipamentoId: uuid("equipamento_id")
    .notNull()
    .references(() => equipamento.id, { onDelete: "restrict" }),
  planoItemId: uuid("plano_item_id")
    .notNull()
    .references(() => planoItem.id, { onDelete: "restrict" }),
  dataPrevista: timestamp("data_prevista").notNull(),
  dataExecutada: timestamp("data_executada"),
  responsavelId: uuid("responsavel_id").references(() => usuario.id, {
    onDelete: "set null",
  }),
  status: statusManutencaoEnum("status").notNull(),
  observacoes: text("observacoes"),
  diasAtraso: integer("dias_atraso").default(0),
  dataProximaManutencao: timestamp("data_proxima_manutencao"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

// Auditoria
export const auditoria = pgTable(
  "auditoria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "restrict" }),
    dataHora: timestamp("data_hora").defaultNow().notNull(),
    operacao: text("operacao").notNull(),
    entidade: text("entidade").notNull(),
    registroId: uuid("registro_id"),
    valorAnterior: jsonb("valor_anterior"),
    valorNovo: jsonb("valor_novo"),
  },
  (table) => [
    index("auditoria_usuario_id_idx").on(table.usuarioId),
    index("auditoria_entidade_registro_id_idx").on(table.entidade, table.registroId),
  ],
);

// Log de Notificações por E-mail
export const notificationLog = pgTable("notification_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  enviadoEm: timestamp("enviado_em").defaultNow().notNull(),
  destinatarios: text("destinatarios").notNull(),
  totalPendencias: integer("total_pendencias").notNull(),
  laboratoriosEnvolvidos: text("laboratorios_envolvidos").notNull(),
  statusEnvio: text("status_envio").notNull().default("sucesso"),
  erroDetalhes: text("erro_detalhes"),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usuarioRelations = relations(usuario, ({ many }) => ({
  historicos: many(historicoManutencao),
  auditorias: many(auditoria),
}));

export const unidadeRelations = relations(unidade, ({ many }) => ({
  laboratorios: many(laboratorio),
  equipamentos: many(equipamento),
}));

export const laboratorioRelations = relations(laboratorio, ({ one, many }) => ({
  unidade: one(unidade, {
    fields: [laboratorio.unidadeId],
    references: [unidade.id],
  }),
  equipamentos: many(equipamento),
}));

export const fabricanteRelations = relations(fabricante, ({ many }) => ({
  modelos: many(modelo),
  equipamentos: many(equipamento),
}));

export const tipoEquipamentoRelations = relations(tipoEquipamento, ({ many }) => ({
  classificacoes: many(classificacao),
  equipamentos: many(equipamento),
}));

export const classificacaoRelations = relations(classificacao, ({ one, many }) => ({
  tipoEquipamento: one(tipoEquipamento, {
    fields: [classificacao.tipoEquipamentoId],
    references: [tipoEquipamento.id],
  }),
  modelos: many(modelo),
  equipamentos: many(equipamento),
  planosManutencao: many(planoManutencao),
}));

export const modeloRelations = relations(modelo, ({ one, many }) => ({
  fabricante: one(fabricante, {
    fields: [modelo.fabricanteId],
    references: [fabricante.id],
  }),
  classificacao: one(classificacao, {
    fields: [modelo.classificacaoId],
    references: [classificacao.id],
  }),
  equipamentos: many(equipamento),
  planosManutencao: many(planoManutencao),
}));

export const equipamentoRelations = relations(equipamento, ({ one, many }) => ({
  fabricante: one(fabricante, {
    fields: [equipamento.fabricanteId],
    references: [fabricante.id],
  }),
  modelo: one(modelo, {
    fields: [equipamento.modeloId],
    references: [modelo.id],
  }),
  tipoEquipamento: one(tipoEquipamento, {
    fields: [equipamento.tipoEquipamentoId],
    references: [tipoEquipamento.id],
  }),
  classificacao: one(classificacao, {
    fields: [equipamento.classificacaoId],
    references: [classificacao.id],
  }),
  unidade: one(unidade, {
    fields: [equipamento.unidadeId],
    references: [unidade.id],
  }),
  laboratorio: one(laboratorio, {
    fields: [equipamento.laboratorioId],
    references: [laboratorio.id],
  }),
  manutencoesProgramadas: many(manutencaoProgramada),
  historicos: many(historicoManutencao),
}));

export const planoManutencaoRelations = relations(planoManutencao, ({ one, many }) => ({
  classificacao: one(classificacao, {
    fields: [planoManutencao.classificacaoId],
    references: [classificacao.id],
  }),
  modelo: one(modelo, {
    fields: [planoManutencao.modeloId],
    references: [modelo.id],
  }),
  itens: many(planoItem),
}));

export const planoItemRelations = relations(planoItem, ({ one, many }) => ({
  planoManutencao: one(planoManutencao, {
    fields: [planoItem.planoManutencaoId],
    references: [planoManutencao.id],
  }),
  manutencoesProgramadas: many(manutencaoProgramada),
  historicos: many(historicoManutencao),
}));

export const manutencaoProgramadaRelations = relations(manutencaoProgramada, ({ one }) => ({
  equipamento: one(equipamento, {
    fields: [manutencaoProgramada.equipamentoId],
    references: [equipamento.id],
  }),
  planoItem: one(planoItem, {
    fields: [manutencaoProgramada.planoItemId],
    references: [planoItem.id],
  }),
  historico: one(historicoManutencao, {
    fields: [manutencaoProgramada.id],
    references: [historicoManutencao.manutencaoProgramadaId],
  }),
}));

export const historicoManutencaoRelations = relations(historicoManutencao, ({ one }) => ({
  manutencaoProgramada: one(manutencaoProgramada, {
    fields: [historicoManutencao.manutencaoProgramadaId],
    references: [manutencaoProgramada.id],
  }),
  equipamento: one(equipamento, {
    fields: [historicoManutencao.equipamentoId],
    references: [equipamento.id],
  }),
  planoItem: one(planoItem, {
    fields: [historicoManutencao.planoItemId],
    references: [planoItem.id],
  }),
  responsavel: one(usuario, {
    fields: [historicoManutencao.responsavelId],
    references: [usuario.id],
  }),
}));

export const auditoriaRelations = relations(auditoria, ({ one }) => ({
  usuario: one(usuario, {
    fields: [auditoria.usuarioId],
    references: [usuario.id],
  }),
}));

CREATE TYPE "public"."nivel_plano" AS ENUM('base', 'classificacao', 'modelo');--> statement-breakpoint
CREATE TYPE "public"."perfil" AS ENUM('admin', 'tecnico');--> statement-breakpoint
CREATE TYPE "public"."periodicidade" AS ENUM('diario', 'semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral', 'anual');--> statement-breakpoint
CREATE TYPE "public"."situacao_equipamento" AS ENUM('ativo', 'fora_de_uso', 'em_manutencao', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."status_manutencao" AS ENUM('programada', 'pendente', 'em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_plano_item" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"data_hora" timestamp DEFAULT now() NOT NULL,
	"operacao" text NOT NULL,
	"entidade" text NOT NULL,
	"registro_id" uuid,
	"valor_anterior" jsonb,
	"valor_novo" jsonb
);
--> statement-breakpoint
CREATE TABLE "classificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo_equipamento_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patrimonio" text NOT NULL,
	"numero_serie" text NOT NULL,
	"fabricante_id" uuid NOT NULL,
	"modelo_id" uuid NOT NULL,
	"tipo_equipamento_id" uuid NOT NULL,
	"classificacao_id" uuid NOT NULL,
	"unidade_id" uuid NOT NULL,
	"laboratorio_id" uuid NOT NULL,
	"data_cadastro" timestamp DEFAULT now() NOT NULL,
	"situacao" "situacao_equipamento" DEFAULT 'ativo' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipamento_patrimonio_unique" UNIQUE("patrimonio")
);
--> statement-breakpoint
CREATE TABLE "fabricante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manutencao_programada_id" uuid,
	"equipamento_id" uuid NOT NULL,
	"plano_item_id" uuid NOT NULL,
	"data_prevista" timestamp NOT NULL,
	"data_executada" timestamp,
	"responsavel_id" uuid,
	"status" "status_manutencao" NOT NULL,
	"observacoes" text,
	"dias_atraso" integer DEFAULT 0,
	"data_proxima_manutencao" timestamp,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laboratorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"unidade_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manutencao_programada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipamento_id" uuid NOT NULL,
	"plano_item_id" uuid NOT NULL,
	"data_prevista" timestamp NOT NULL,
	"status" "status_manutencao" DEFAULT 'programada' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"fabricante_id" uuid NOT NULL,
	"classificacao_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plano_manutencao_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"periodicidade" "periodicidade" NOT NULL,
	"categoria" text NOT NULL,
	"status" "status_plano_item" DEFAULT 'ativo' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_manutencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nivel" "nivel_plano" NOT NULL,
	"classificacao_id" uuid,
	"modelo_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_equipamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unidade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"perfil" "perfil" DEFAULT 'tecnico' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classificacao" ADD CONSTRAINT "classificacao_tipo_equipamento_id_tipo_equipamento_id_fk" FOREIGN KEY ("tipo_equipamento_id") REFERENCES "public"."tipo_equipamento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_fabricante_id_fabricante_id_fk" FOREIGN KEY ("fabricante_id") REFERENCES "public"."fabricante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_modelo_id_modelo_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_tipo_equipamento_id_tipo_equipamento_id_fk" FOREIGN KEY ("tipo_equipamento_id") REFERENCES "public"."tipo_equipamento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_classificacao_id_classificacao_id_fk" FOREIGN KEY ("classificacao_id") REFERENCES "public"."classificacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_unidade_id_unidade_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidade"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_laboratorio_id_laboratorio_id_fk" FOREIGN KEY ("laboratorio_id") REFERENCES "public"."laboratorio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_manutencao" ADD CONSTRAINT "historico_manutencao_manutencao_programada_id_manutencao_programada_id_fk" FOREIGN KEY ("manutencao_programada_id") REFERENCES "public"."manutencao_programada"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_manutencao" ADD CONSTRAINT "historico_manutencao_equipamento_id_equipamento_id_fk" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_manutencao" ADD CONSTRAINT "historico_manutencao_plano_item_id_plano_item_id_fk" FOREIGN KEY ("plano_item_id") REFERENCES "public"."plano_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_manutencao" ADD CONSTRAINT "historico_manutencao_responsavel_id_usuario_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laboratorio" ADD CONSTRAINT "laboratorio_unidade_id_unidade_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidade"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manutencao_programada" ADD CONSTRAINT "manutencao_programada_equipamento_id_equipamento_id_fk" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manutencao_programada" ADD CONSTRAINT "manutencao_programada_plano_item_id_plano_item_id_fk" FOREIGN KEY ("plano_item_id") REFERENCES "public"."plano_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo" ADD CONSTRAINT "modelo_fabricante_id_fabricante_id_fk" FOREIGN KEY ("fabricante_id") REFERENCES "public"."fabricante"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelo" ADD CONSTRAINT "modelo_classificacao_id_classificacao_id_fk" FOREIGN KEY ("classificacao_id") REFERENCES "public"."classificacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_item" ADD CONSTRAINT "plano_item_plano_manutencao_id_plano_manutencao_id_fk" FOREIGN KEY ("plano_manutencao_id") REFERENCES "public"."plano_manutencao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_manutencao" ADD CONSTRAINT "plano_manutencao_classificacao_id_classificacao_id_fk" FOREIGN KEY ("classificacao_id") REFERENCES "public"."classificacao"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_manutencao" ADD CONSTRAINT "plano_manutencao_modelo_id_modelo_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "auditoria_entidade_registro_id_idx" ON "auditoria" USING btree ("entidade","registro_id");
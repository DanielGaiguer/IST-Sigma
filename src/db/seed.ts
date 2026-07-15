import "dotenv/config";
import { hashSync } from "bcryptjs";
import { db } from "./index";
import {
  auditoria,
  classificacao,
  equipamento,
  fabricante,
  historicoManutencao,
  laboratorio,
  manutencaoProgramada,
  modelo,
  planoItem,
  planoManutencao,
  tipoEquipamento,
  unidade,
  usuario,
} from "./schema";

const UUID = {
  unidadeLondrina: "a1000000-0000-0000-0000-000000000001",
  labQuimica: "a2000000-0000-0000-0000-000000000001",
  labFisica: "a2000000-0000-0000-0000-000000000002",
  fabricanteMinipa: "a3000000-0000-0000-0000-000000000001",
  fabricanteRigol: "a3000000-0000-0000-0000-000000000002",
  tipoMultimetro: "a4000000-0000-0000-0000-000000000001",
  tipoOsciloscopio: "a4000000-0000-0000-0000-000000000002",
  classMultPortatil: "a5000000-0000-0000-0000-000000000001",
  classMultBancada: "a5000000-0000-0000-0000-000000000002",
  classOscDigital: "a5000000-0000-0000-0000-000000000003",
  classOscAnalogico: "a5000000-0000-0000-0000-000000000004",
  modeloMinipaMT: "a6000000-0000-0000-0000-000000000001",
  modeloRigolDS: "a6000000-0000-0000-0000-000000000002",
  planoBaseMult: "a7000000-0000-0000-0000-000000000001",
  planoClassMultPort: "a7000000-0000-0000-0000-000000000002",
  usuarioAdmin: "a8000000-0000-0000-0000-000000000001",
  usuarioTecnico: "a8000000-0000-0000-0000-000000000002",
  equip1: "a9000000-0000-0000-0000-000000000001",
  equip2: "a9000000-0000-0000-0000-000000000002",
  planoItemLimpeza: "b1000000-0000-0000-0000-000000000001",
  planoItemCalibracao: "b1000000-0000-0000-0000-000000000002",
  planoItemInspecao: "b1000000-0000-0000-0000-000000000003",
  planoItemTeste: "b1000000-0000-0000-0000-000000000004",
  planoItemFuncional: "b1000000-0000-0000-0000-000000000005",
  planoItemBateria: "b1000000-0000-0000-0000-000000000006",
} as const;

async function seed() {
  console.log("Seeding database...");

  // ── 1. Usuarios ──────────────────────────────────────────────────────────
  const senhaHash = hashSync("senha123", 10);

  await db
    .insert(usuario)
    .values([
      {
        id: UUID.usuarioAdmin,
        nome: "Admin LabCare",
        email: "admin@labcare.com",
        senhaHash,
        perfil: "admin",
      },
      {
        id: UUID.usuarioTecnico,
        nome: "Carlos Tecnico",
        email: "carlos@labcare.com",
        senhaHash,
        perfil: "tecnico",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 usuarios");

  // ── 2. Unidade ───────────────────────────────────────────────────────────
  await db
    .insert(unidade)
    .values({ id: UUID.unidadeLondrina, nome: "Londrina" })
    .onConflictDoNothing();
  console.log("  ✓ 1 unidade");

  // ── 3. Laboratorios ──────────────────────────────────────────────────────
  await db
    .insert(laboratorio)
    .values([
      {
        id: UUID.labQuimica,
        nome: "Laboratório de Química",
        unidadeId: UUID.unidadeLondrina,
      },
      {
        id: UUID.labFisica,
        nome: "Laboratório de Física",
        unidadeId: UUID.unidadeLondrina,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 laboratorios");

  // ── 4. Fabricantes ───────────────────────────────────────────────────────
  await db
    .insert(fabricante)
    .values([
      { id: UUID.fabricanteMinipa, nome: "Minipa" },
      { id: UUID.fabricanteRigol, nome: "Rigol" },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 fabricantes");

  // ── 5. Tipos de Equipamento ──────────────────────────────────────────────
  await db
    .insert(tipoEquipamento)
    .values([
      { id: UUID.tipoMultimetro, nome: "Multímetro" },
      { id: UUID.tipoOsciloscopio, nome: "Osciloscópio" },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 tipos de equipamento");

  // ── 6. Classificacoes ────────────────────────────────────────────────────
  await db
    .insert(classificacao)
    .values([
      {
        id: UUID.classMultPortatil,
        nome: "Multímetro Portátil",
        tipoEquipamentoId: UUID.tipoMultimetro,
      },
      {
        id: UUID.classMultBancada,
        nome: "Multímetro de Bancada",
        tipoEquipamentoId: UUID.tipoMultimetro,
      },
      {
        id: UUID.classOscDigital,
        nome: "Osciloscópio Digital",
        tipoEquipamentoId: UUID.tipoOsciloscopio,
      },
      {
        id: UUID.classOscAnalogico,
        nome: "Osciloscópio Analógico",
        tipoEquipamentoId: UUID.tipoOsciloscopio,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 4 classificacoes");

  // ── 7. Modelos ───────────────────────────────────────────────────────────
  await db
    .insert(modelo)
    .values([
      {
        id: UUID.modeloMinipaMT,
        nome: "MT-4090",
        fabricanteId: UUID.fabricanteMinipa,
        classificacaoId: UUID.classMultPortatil,
      },
      {
        id: UUID.modeloRigolDS,
        nome: "DS1054Z",
        fabricanteId: UUID.fabricanteRigol,
        classificacaoId: UUID.classOscDigital,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 modelos");

  // ── 8. Planos de Manutencao ──────────────────────────────────────────────
  // Plano BASE para tipo Multímetro (classificacaoId e modeloId null)
  await db
    .insert(planoManutencao)
    .values({
      id: UUID.planoBaseMult,
      nome: "Plano Base - Multímetro",
      nivel: "base",
      classificacaoId: null,
      modeloId: null,
    })
    .onConflictDoNothing();

  // Plano CLASSIFICACAO para Multímetro Portátil
  await db
    .insert(planoManutencao)
    .values({
      id: UUID.planoClassMultPort,
      nome: "Plano Classificação - Multímetro Portátil",
      nivel: "classificacao",
      classificacaoId: UUID.classMultPortatil,
      modeloId: null,
    })
    .onConflictDoNothing();
  console.log("  ✓ 2 planos de manutencao");

  // ── 9. Itens do Plano Base ───────────────────────────────────────────────
  await db
    .insert(planoItem)
    .values([
      {
        id: UUID.planoItemLimpeza,
        planoManutencaoId: UUID.planoBaseMult,
        nome: "Limpeza Geral",
        descricao: "Limpeza externa do equipamento com pano antiestático",
        periodicidade: "mensal",
        categoria: "Preventiva",
      },
      {
        id: UUID.planoItemCalibracao,
        planoManutencaoId: UUID.planoBaseMult,
        nome: "Calibração Completa",
        descricao: "Calibração em laboratório acreditado according to ISO 17025",
        periodicidade: "anual",
        categoria: "Calibração",
      },
      {
        id: UUID.planoItemInspecao,
        planoManutencaoId: UUID.planoBaseMult,
        nome: "Inspeção Visual",
        descricao: "Verificação visual de danos, cabos, terminais e display",
        periodicidade: "trimestral",
        categoria: "Preventiva",
      },
      {
        id: UUID.planoItemTeste,
        planoManutencaoId: UUID.planoBaseMult,
        nome: "Teste de Funcionamento",
        descricao: "Teste com padrão Known para verificar medição em todos os rangos",
        periodicidade: "semestral",
        categoria: "Teste",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 4 itens no plano base");

  // ── 10. Itens do Plano Classificacao (Multímetro Portátil) ───────────────
  await db
    .insert(planoItem)
    .values([
      {
        id: UUID.planoItemFuncional,
        planoManutencaoId: UUID.planoClassMultPort,
        nome: "Verificação de Bateria",
        descricao: "Testar autonomia da bateria e verificar necessidade de substituição",
        periodicidade: "trimestral",
        categoria: "Preventiva",
      },
      {
        id: UUID.planoItemBateria,
        planoManutencaoId: UUID.planoClassMultPort,
        nome: "Calibração Portátil",
        descricao: "Calibração rápida em campo usando referência portátil",
        periodicidade: "semestral",
        categoria: "Calibração",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 itens no plano de classificacao");

  // ── 11. Equipamentos ─────────────────────────────────────────────────────
  await db
    .insert(equipamento)
    .values([
      {
        id: UUID.equip1,
        patrimonio: "001234",
        numeroSerie: "SN-MT4090-001",
        fabricanteId: UUID.fabricanteMinipa,
        modeloId: UUID.modeloMinipaMT,
        tipoEquipamentoId: UUID.tipoMultimetro,
        classificacaoId: UUID.classMultPortatil,
        unidadeId: UUID.unidadeLondrina,
        laboratorioId: UUID.labQuimica,
        situacao: "ativo",
      },
      {
        id: UUID.equip2,
        patrimonio: "005678",
        numeroSerie: "SN-DS1054Z-002",
        fabricanteId: UUID.fabricanteRigol,
        modeloId: UUID.modeloRigolDS,
        tipoEquipamentoId: UUID.tipoOsciloscopio,
        classificacaoId: UUID.classOscDigital,
        unidadeId: UUID.unidadeLondrina,
        laboratorioId: UUID.labFisica,
        situacao: "ativo",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 equipamentos");

  // ── 12. Manutencoes Programadas (exemplo) ────────────────────────────────
  await db
    .insert(manutencaoProgramada)
    .values([
      {
        equipamentoId: UUID.equip1,
        planoItemId: UUID.planoItemLimpeza,
        dataPrevista: new Date("2026-08-01T09:00:00Z"),
        status: "programada",
      },
      {
        equipamentoId: UUID.equip1,
        planoItemId: UUID.planoItemInspecao,
        dataPrevista: new Date("2026-09-15T09:00:00Z"),
        status: "pendente",
      },
      {
        equipamentoId: UUID.equip2,
        planoItemId: UUID.planoItemLimpeza,
        dataPrevista: new Date("2026-08-10T14:00:00Z"),
        status: "programada",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 3 manutencoes programadas");

  // ── 13. Historico de Manutencao (exemplo) ────────────────────────────────
  await db
    .insert(historicoManutencao)
    .values([
      {
        equipamentoId: UUID.equip1,
        planoItemId: UUID.planoItemLimpeza,
        dataPrevista: new Date("2026-06-01T09:00:00Z"),
        dataExecutada: new Date("2026-06-03T10:30:00Z"),
        responsavelId: UUID.usuarioTecnico,
        status: "concluida",
        observacoes: "Limpeza realizada. Equipamento em bom estado.",
        diasAtraso: 2,
        dataProximaManutencao: new Date("2026-07-01T09:00:00Z"),
      },
      {
        equipamentoId: UUID.equip2,
        planoItemId: UUID.planoItemLimpeza,
        dataPrevista: new Date("2026-06-10T14:00:00Z"),
        dataExecutada: new Date("2026-06-10T15:00:00Z"),
        responsavelId: UUID.usuarioTecnico,
        status: "concluida",
        observacoes: "Limpeza preventiva concluída.",
        diasAtraso: 0,
        dataProximaManutencao: new Date("2026-07-10T14:00:00Z"),
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 historicos de manutencao");

  // ── 14. Auditoria (exemplo) ──────────────────────────────────────────────
  await db
    .insert(auditoria)
    .values([
      {
        usuarioId: UUID.usuarioAdmin,
        operacao: "INSERT",
        entidade: "equipamento",
        registroId: UUID.equip1,
        valorNovo: {
          patrimonio: "001234",
          numeroSerie: "SN-MT4090-001",
          situacao: "ativo",
        },
      },
      {
        usuarioId: UUID.usuarioAdmin,
        operacao: "INSERT",
        entidade: "equipamento",
        registroId: UUID.equip2,
        valorNovo: {
          patrimonio: "005678",
          numeroSerie: "SN-DS1054Z-002",
          situacao: "ativo",
        },
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 registros de auditoria");

  console.log("\nSeed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

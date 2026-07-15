import { NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import {
  equipamento,
  fabricante,
  modelo,
  tipoEquipamento,
  classificacao,
  unidade,
  laboratorio,
} from "@/db/schema";
import { criarEquipamentoSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import { gerarManutencoesParaEquipamento } from "@/server/maintenance-engine";
import { getServerSession } from "@/lib/auth";

const equipamentoComRelacoes = {
  id: equipamento.id,
  patrimonio: equipamento.patrimonio,
  numeroSerie: equipamento.numeroSerie,
  fabricanteId: equipamento.fabricanteId,
  modeloId: equipamento.modeloId,
  tipoEquipamentoId: equipamento.tipoEquipamentoId,
  classificacaoId: equipamento.classificacaoId,
  unidadeId: equipamento.unidadeId,
  laboratorioId: equipamento.laboratorioId,
  dataCadastro: equipamento.dataCadastro,
  situacao: equipamento.situacao,
  criadoEm: equipamento.criadoEm,
  atualizadoEm: equipamento.atualizadoEm,
  fabricanteNome: fabricante.nome,
  modeloNome: modelo.nome,
  tipoEquipamentoNome: tipoEquipamento.nome,
  classificacaoNome: classificacao.nome,
  unidadeNome: unidade.nome,
  laboratorioNome: laboratorio.nome,
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(request.url);
    const patrimonio = url.searchParams.get("patrimonio");
    const laboratorioId = url.searchParams.get("laboratorioId");
    const fabricanteId = url.searchParams.get("fabricanteId");
    const modeloId = url.searchParams.get("modeloId");
    const tipoEquipamentoId = url.searchParams.get("tipoEquipamentoId");
    const classificacaoId = url.searchParams.get("classificacaoId");
    const situacao = url.searchParams.get("situacao");

    const conditions = [];
    if (patrimonio) conditions.push(ilike(equipamento.patrimonio, `%${patrimonio}%`));
    if (laboratorioId) conditions.push(eq(equipamento.laboratorioId, laboratorioId));
    if (fabricanteId) conditions.push(eq(equipamento.fabricanteId, fabricanteId));
    if (modeloId) conditions.push(eq(equipamento.modeloId, modeloId));
    if (tipoEquipamentoId) conditions.push(eq(equipamento.tipoEquipamentoId, tipoEquipamentoId));
    if (classificacaoId) conditions.push(eq(equipamento.classificacaoId, classificacaoId));
    if (situacao)
      conditions.push(
        eq(
          equipamento.situacao,
          situacao as "ativo" | "fora_de_uso" | "em_manutencao" | "descartado",
        ),
      );

    let query = db
      .select(equipamentoComRelacoes)
      .from(equipamento)
      .innerJoin(fabricante, eq(equipamento.fabricanteId, fabricante.id))
      .innerJoin(modelo, eq(equipamento.modeloId, modelo.id))
      .innerJoin(tipoEquipamento, eq(equipamento.tipoEquipamentoId, tipoEquipamento.id))
      .innerJoin(classificacao, eq(equipamento.classificacaoId, classificacao.id))
      .innerJoin(unidade, eq(equipamento.unidadeId, unidade.id))
      .innerJoin(laboratorio, eq(equipamento.laboratorioId, laboratorio.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const records = await query;
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar equipamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (session.user.perfil !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem cadastrar equipamentos." },
        { status: 403 },
      );
    }
    const body = await request.json();
    const parsed = criarEquipamentoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const [existingPatrimonio] = await db
      .select({ id: equipamento.id })
      .from(equipamento)
      .where(eq(equipamento.patrimonio, data.patrimonio))
      .limit(1);

    if (existingPatrimonio) {
      return NextResponse.json(
        { error: "Já existe um equipamento com este patrimônio." },
        { status: 409 },
      );
    }

    const validateRefs = [
      { table: fabricante, id: data.fabricanteId, name: "Fabricante" },
      { table: modelo, id: data.modeloId, name: "Modelo" },
      { table: tipoEquipamento, id: data.tipoEquipamentoId, name: "Tipo de equipamento" },
      { table: classificacao, id: data.classificacaoId, name: "Classificação" },
      { table: unidade, id: data.unidadeId, name: "Unidade" },
      { table: laboratorio, id: data.laboratorioId, name: "Laboratório" },
    ] as const;

    for (const ref of validateRefs) {
      const [record] = await db
        .select({ id: ref.table.id })
        .from(ref.table)
        .where(eq(ref.table.id, ref.id))
        .limit(1);
      if (!record) {
        return NextResponse.json({ error: `${ref.name} não encontrado(a).` }, { status: 400 });
      }
    }

    const [created] = await db
      .insert(equipamento)
      .values({ ...data, situacao: data.situacao ?? "ativo" })
      .returning();

    try {
      await gerarManutencoesParaEquipamento(created.id);
    } catch {
      await db.delete(equipamento).where(eq(equipamento.id, created.id));
      return NextResponse.json(
        {
          error:
            "Equipamento criado, mas falha ao gerar manutenções programadas. " +
            "Verifique se existem planos de manutenção configurados para esta classificação/modelo. " +
            "Cadastro revertido.",
        },
        { status: 400 },
      );
    }

    await registrarAuditoria({
      usuarioId: session.user.id,
      operacao: "INSERT",
      entidade: "equipamento",
      registroId: created.id,
      valorNovo: created,
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar equipamento." }, { status: 500 });
  }
}

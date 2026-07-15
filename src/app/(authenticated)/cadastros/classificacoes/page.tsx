"use client";

import { Tag } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Classificações",
  subtitle: "Gerenciamento de classificações de equipamentos.",
  icon: Tag,
  entityName: "Classificação",
  apiEndpoint: "/api/classificacoes",
  columns: [
    { key: "nome", label: "Nome" },
    {
      key: "tipoEquipamentoId",
      label: "Tipo de Equipamento",
      fk: { endpoint: "/api/tipos-equipamento", idKey: "tipoEquipamentoId" },
    },
  ],
  formFields: [
    {
      key: "nome",
      label: "Nome da Classificação",
      placeholder: "Ex: Autoclave Compacta",
      maxLength: 200,
    },
    {
      key: "tipoEquipamentoId",
      label: "Tipo de Equipamento",
      type: "select",
    },
  ],
  selectFields: [
    { key: "tipoEquipamentoId", label: "Tipo", apiEndpoint: "/api/tipos-equipamento" },
  ],
};

export default function ClassificacoesPage() {
  return <CrudPage config={config} />;
}

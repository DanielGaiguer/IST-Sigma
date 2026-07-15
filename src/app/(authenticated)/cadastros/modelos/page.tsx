"use client";

import { Puzzle } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Modelos",
  subtitle: "Gerenciamento de modelos de equipamentos.",
  icon: Puzzle,
  entityName: "Modelo",
  apiEndpoint: "/api/modelos",
  columns: [
    { key: "nome", label: "Nome" },
    {
      key: "fabricanteId",
      label: "Fabricante",
      fk: { endpoint: "/api/fabricantes", idKey: "fabricanteId" },
    },
    {
      key: "classificacaoId",
      label: "Classificação",
      fk: { endpoint: "/api/classificacoes", idKey: "classificacaoId" },
    },
  ],
  formFields: [
    { key: "nome", label: "Nome do Modelo", placeholder: "Ex: Centrifuge 5430 R", maxLength: 200 },
    {
      key: "fabricanteId",
      label: "Fabricante",
      type: "select",
    },
    {
      key: "classificacaoId",
      label: "Classificação",
      type: "select",
    },
  ],
  selectFields: [
    { key: "fabricanteId", label: "Fabricante", apiEndpoint: "/api/fabricantes" },
    { key: "classificacaoId", label: "Classificação", apiEndpoint: "/api/classificacoes" },
  ],
};

export default function ModelosPage() {
  return <CrudPage config={config} />;
}

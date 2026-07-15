"use client";

import { Beaker } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Laboratórios",
  subtitle: "Gerenciamento de laboratórios.",
  icon: Beaker,
  entityName: "Laboratório",
  apiEndpoint: "/api/laboratorios",
  columns: [
    { key: "nome", label: "Nome" },
    { key: "unidadeId", label: "Unidade", fk: { endpoint: "/api/unidades", idKey: "unidadeId" } },
  ],
  formFields: [
    {
      key: "nome",
      label: "Nome do Laboratório",
      placeholder: "Ex: Laboratório de Análises",
      maxLength: 200,
    },
    {
      key: "unidadeId",
      label: "Unidade",
      type: "select",
    },
  ],
  selectFields: [{ key: "unidadeId", label: "Unidade", apiEndpoint: "/api/unidades" }],
};

export default function LaboratoriosPage() {
  return <CrudPage config={config} />;
}

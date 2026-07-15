"use client";

import { Landmark } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Unidades",
  subtitle: "Gerenciamento de unidades do sistema.",
  icon: Landmark,
  entityName: "Unidade",
  apiEndpoint: "/api/unidades",
  columns: [{ key: "nome", label: "Nome" }],
  formFields: [
    { key: "nome", label: "Nome da Unidade", placeholder: "Ex: Hospital Central", maxLength: 200 },
  ],
};

export default function UnidadesPage() {
  return <CrudPage config={config} />;
}

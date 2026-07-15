"use client";

import { Factory } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Fabricantes",
  subtitle: "Gerenciamento de fabricantes de equipamentos.",
  icon: Factory,
  entityName: "Fabricante",
  apiEndpoint: "/api/fabricantes",
  columns: [{ key: "nome", label: "Nome" }],
  formFields: [
    {
      key: "nome",
      label: "Nome do Fabricante",
      placeholder: "Ex: Siemens Healthineers",
      maxLength: 200,
    },
  ],
};

export default function FabricantesPage() {
  return <CrudPage config={config} />;
}

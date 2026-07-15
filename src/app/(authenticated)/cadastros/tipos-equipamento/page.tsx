"use client";

import { Cpu } from "lucide-react";
import { CrudPage } from "@/components/cadastros/crud-page";
import type { CrudConfig } from "@/components/cadastros/crud-page";

const config: CrudConfig = {
  title: "Tipos de Equipamento",
  subtitle: "Gerenciamento de tipos de equipamento.",
  icon: Cpu,
  entityName: "Tipo de Equipamento",
  apiEndpoint: "/api/tipos-equipamento",
  columns: [{ key: "nome", label: "Nome" }],
  formFields: [
    { key: "nome", label: "Nome do Tipo", placeholder: "Ex: Centrífuga", maxLength: 200 },
  ],
};

export default function TiposEquipamentoPage() {
  return <CrudPage config={config} />;
}

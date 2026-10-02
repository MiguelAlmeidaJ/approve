import type { UserPermission, UserRole } from "./api";

export const PERMISSION_OPTIONS: Array<{
  value: UserPermission;
  label: string;
  description: string;
  group: string;
}> = [
  {
    value: "CLIENTS_MANAGE",
    label: "Gerenciar clientes",
    description: "Criar e editar cadastros, acessos e dados dos clientes.",
    group: "Gestão"
  },
  {
    value: "CALENDARS_MANAGE",
    label: "Gerenciar calendários",
    description: "Criar, editar, arquivar e restaurar calendários.",
    group: "Operação"
  },
  {
    value: "CONTENT_MANAGE",
    label: "Planejamento de conteúdo",
    description: "Criar e editar pautas e conteúdos dos clientes atribuídos.",
    group: "Conteúdo"
  },
  {
    value: "PRODUCTION_MANAGE",
    label: "Produção de artes",
    description: "Atualizar produção, anexar artes e enviar para aprovação.",
    group: "Operação"
  },
  {
    value: "STANDALONE_MANAGE",
    label: "Artes avulsas",
    description: "Criar e movimentar demandas de artes avulsas atribuídas.",
    group: "Operação"
  },
  {
    value: "SCHEDULING_MANAGE",
    label: "Programação e publicação",
    description: "Marcar conteúdos como programados, publicados ou com erro.",
    group: "Publicação"
  },
  {
    value: "REPORTS_VIEW",
    label: "Relatórios e métricas",
    description: "Visualizar resultados e registrar métricas de conteúdos.",
    group: "Resultados"
  }
];

export const DEFAULT_DESIGNER_PERMISSIONS: UserPermission[] = [
  "CONTENT_MANAGE",
  "PRODUCTION_MANAGE",
  "STANDALONE_MANAGE"
];

export function hasUserPermission(
  user: { role: UserRole; permissions?: UserPermission[] },
  permission: UserPermission
) {
  return (
    user.role === "DEV" ||
    user.role === "ADMIN" ||
    (user.permissions ?? []).includes(permission)
  );
}

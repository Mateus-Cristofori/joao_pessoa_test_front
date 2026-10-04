export type TicketCategoryEnum =
  | "IT"
  | "HR"
  | "PURCHASES"
  | "FINANCE"
  | "INFRASTRUCTURE";
export type TicketStatusEnum = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export interface TicketSummary {
  id: string;
  code: string;
  title: string;
  category: TicketCategoryEnum;
  description: string;
  requester: string;
  status: TicketStatusEnum;
  createdAt: string;
}

export interface CategoryCount {
  category: TicketCategoryEnum;
  count: number;
}

export interface DashboardSummaryResponse {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  recentToday: TicketSummary[];
  byCategory: CategoryCount[];
}

// Mapeadores para PT-BR
export const translateCategory = (category: TicketCategoryEnum): string => {
  const map: Record<TicketCategoryEnum, string> = {
    IT: "Tecnologia da Informação",
    HR: "Recursos Humanos",
    PURCHASES: "Compras",
    FINANCE: "Financeiro",
    INFRASTRUCTURE: "Infraestrutura",
  };
  return map[category] || category;
};

export const translateStatus = (status: TicketStatusEnum): string => {
  const map: Record<TicketStatusEnum, string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em Andamento",
    COMPLETED: "Concluído",
  };
  return map[status] || status;
};

export const getStatusBadgeClass = (status: TicketStatusEnum): string => {
  const map: Record<TicketStatusEnum, string> = {
    OPEN: "status-open",
    IN_PROGRESS: "status-in-progress",
    COMPLETED: "status-completed",
  };
  return map[status] || "";
};

export interface TicketResponse {
  id: string;
  userId: string;
  code: string;
  title: string;
  description: string;
  category: TicketCategoryEnum;
  status: TicketStatusEnum;
  createdAt: string;
  requester?: string;
}

export interface TicketFormData {
  title: string;
  description: string;
  category: TicketCategoryEnum | "";
}

export interface Filters {
  title: string;
  category: TicketCategoryEnum | "";
  status: TicketStatusEnum | "";
  startDate: string;
  endDate: string;
}

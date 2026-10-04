import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import axios from "axios";
import { api } from "../api/api";
import {
  type Filters,
  type TicketCategoryEnum,
  type TicketFormData,
  type TicketResponse,
  type TicketStatusEnum,
  getStatusBadgeClass,
  translateCategory,
  translateStatus,
} from "../types/types";
import "./Tickets.css";
import Sidebar from "../components/sidebar/SideBar";
import { Icons } from "./Icons";

const categories: TicketCategoryEnum[] = [
  "IT",
  "HR",
  "PURCHASES",
  "FINANCE",
  "INFRASTRUCTURE",
];

const statuses: TicketStatusEnum[] = ["OPEN", "IN_PROGRESS", "COMPLETED"];

const categoryShortLabel: Record<TicketCategoryEnum, string> = {
  IT: "TI",
  HR: "RH",
  PURCHASES: "Compras",
  FINANCE: "Financeiro",
  INFRASTRUCTURE: "Infraestrutura",
};

const categoryClass: Record<TicketCategoryEnum, string> = {
  IT: "cat-it",
  HR: "cat-hr",
  PURCHASES: "cat-purchases",
  FINANCE: "cat-finance",
  INFRASTRUCTURE: "cat-infrastructure",
};

const emptyForm: TicketFormData = { title: "", description: "", category: "" };

const emptyFilters: Filters = {
  title: "",
  category: "",
  status: "",
  startDate: "",
  endDate: "",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const getErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Não foi possível conectar ao servidor. Verifique se o backend está em execução.";
    }
    switch (err.response.status) {
      case 400:
        return "Dados inválidos. Revise os campos e tente novamente.";
      case 401:
        return "Sessão expirada. Faça login novamente.";
      case 403:
        return "Você não tem permissão para realizar esta ação.";
      case 404:
        return "Solicitação não encontrada. Atualize a lista e tente novamente.";
    }
  }
  return fallback;
};

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
  small?: boolean;
}

const Modal = ({
  title,
  onClose,
  children,
  footer,
  closeOnOverlay = true,
  small = false,
}: ModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tk-overlay" onMouseDown={() => closeOnOverlay && onClose()}>
      <div
        className={`tk-modal ${small ? "tk-modal-small" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tk-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="tk-icon-btn"
            aria-label="Fechar"
            onClick={onClose}
          >
            {Icons.x()}
          </button>
        </div>
        <div className="tk-modal-body">{children}</div>
        {footer && <div className="tk-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

const Tickets = () => {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [formModal, setFormModal] = useState<
    { mode: "create" } | { mode: "edit"; ticket: TicketResponse } | null
  >(null);
  const [form, setForm] = useState<TicketFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewTicket, setViewTicket] = useState<TicketResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicketResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [statusMenu, setStatusMenu] = useState<{
    ticket: TicketResponse;
    top: number;
    right: number;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => setToast({ type, message }),
    [],
  );

  const loadTickets = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<TicketResponse[]>("/ticket/list-all", {
        signal,
      });
      setTickets(response.data ?? []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(
        getErrorMessage(err, "Não foi possível carregar as solicitações."),
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTickets(controller.signal);
    return () => controller.abort();
  }, [loadTickets]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!statusMenu) return;
    const close = () => setStatusMenu(null);
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".tk-status-menu") &&
        !target.closest(".tk-status-trigger")
      ) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [statusMenu]);

  const filteredTickets = useMemo(() => {
    const term = filters.title.trim().toLowerCase();
    return [...tickets]
      .filter((t) => !term || t.title.toLowerCase().includes(term))
      .filter((t) => !filters.category || t.category === filters.category)
      .filter((t) => !filters.status || t.status === filters.status)
      .filter(
        (t) =>
          !filters.startDate || t.createdAt.slice(0, 10) >= filters.startDate,
      )
      .filter(
        (t) => !filters.endDate || t.createdAt.slice(0, 10) <= filters.endDate,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tickets, filters]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setFormModal({ mode: "create" });
  };

  const openEdit = (ticket: TicketResponse) => {
    setForm({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
    });
    setFormError(null);
    setFormModal({ mode: "edit", ticket });
  };

  const closeFormModal = useCallback(() => {
    if (!submitting) setFormModal(null);
  }, [submitting]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formModal) return;

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || !description || !form.category) {
      setFormError("Preencha o título, a descrição e a categoria.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (formModal.mode === "create") {
        const { data } = await api.post<TicketResponse>("/ticket", {
          title,
          description,
          category: form.category,
        });
        setTickets((prev) => [data, ...prev]);
        showToast("success", "Solicitação criada com sucesso.");
      } else {
        const { data } = await api.put<TicketResponse>(
          `/ticket/update/${formModal.ticket.id}`,
          { title, description, category: form.category },
        );
        setTickets((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, ...data } : t)),
        );
        showToast("success", "Solicitação atualizada com sucesso.");
      }

      setFormModal(null);
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Não foi possível salvar a solicitação."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusMenu = (
    ticket: TicketResponse,
    e: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (statusMenu?.ticket.id === ticket.id) {
      setStatusMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusMenu({
      ticket,
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  };

  const handleChangeStatus = async (
    ticket: TicketResponse,
    status: TicketStatusEnum,
  ) => {
    setStatusMenu(null);
    if (ticket.status === status) return;

    try {
      setUpdatingId(ticket.id);
      const { data } = await api.patch<TicketResponse>(
        `/ticket/${ticket.id}/status`,
        { status },
      );
      setTickets((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, ...data } : t)),
      );
      showToast(
        "success",
        `Status alterado para "${translateStatus(status)}".`,
      );
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Não foi possível alterar o status."),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/ticket/${deleteTarget.id}`);
      setTickets((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      showToast("success", "Solicitação excluída com sucesso.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Não foi possível excluir a solicitação."),
      );
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  const renderContent = () => {
    if (loading && tickets.length === 0 && !error) {
      return (
        <section
          className="tk-state-loading"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="tk-spinner" />
          <p>Carregando solicitações...</p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="tk-empty" role="alert">
          <div className="tk-empty-icon error">{Icons.alert(36)}</div>
          <h2>Algo deu errado</h2>
          <p>{error}</p>
          <button
            type="button"
            className="tk-btn tk-btn-primary"
            onClick={() => loadTickets()}
          >
            {Icons.refresh(16)}
            <span>Tentar novamente</span>
          </button>
        </section>
      );
    }

    if (tickets.length === 0) {
      return (
        <section className="tk-empty" aria-live="polite">
          <div className="tk-empty-icon">{Icons.inbox(36)}</div>
          <h2>Nenhuma solicitação cadastrada</h2>
          <p>
            Quando você criar a primeira solicitação, ela aparecerá aqui para
            você acompanhar e gerenciar.
          </p>
          <button
            type="button"
            className="tk-btn tk-btn-primary"
            onClick={openCreate}
          >
            {Icons.plus(16)}
            <span>Criar primeira solicitação</span>
          </button>
        </section>
      );
    }

    return (
      <>
        {/* Filtros */}
        <section className="tk-card tk-filters">
          <div className="tk-field">
            <label htmlFor="filter-title">Título</label>
            <div className="tk-input-icon">
              {Icons.search(16)}
              <input
                id="filter-title"
                type="text"
                placeholder="Buscar por título..."
                value={filters.title}
                onChange={(e) => updateFilter("title", e.target.value)}
              />
            </div>
          </div>

          <div className="tk-field">
            <label htmlFor="filter-category">Categoria</label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(e) =>
                updateFilter("category", e.target.value as Filters["category"])
              }
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {translateCategory(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) =>
                updateFilter("status", e.target.value as Filters["status"])
              }
            >
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {translateStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label htmlFor="filter-start">Data inicial</label>
            <input
              id="filter-start"
              type="date"
              value={filters.startDate}
              max={filters.endDate || undefined}
              onChange={(e) => updateFilter("startDate", e.target.value)}
            />
          </div>

          <div className="tk-field">
            <label htmlFor="filter-end">Data final</label>
            <input
              id="filter-end"
              type="date"
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={(e) => updateFilter("endDate", e.target.value)}
            />
          </div>
        </section>

        {/* Tabela */}
        <section className="tk-card tk-table-card">
          {filteredTickets.length === 0 ? (
            <div className="tk-no-results">
              <div className="tk-empty-icon small">{Icons.filterOff(26)}</div>
              <h2>Nenhum resultado encontrado</h2>
              <p>Nenhuma solicitação corresponde aos filtros aplicados.</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="tk-btn tk-btn-ghost"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="tk-table-scroll">
              <table className="tk-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Título</th>
                    <th>Categoria</th>
                    <th>Solicitante</th>
                    <th>Data de abertura</th>
                    <th>Status</th>
                    <th className="tk-th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const isOpen = ticket.status === "OPEN";
                    return (
                      <tr key={ticket.id}>
                        <td>
                          <span className="tk-code">{ticket.code}</span>
                        </td>
                        <td className="tk-title-cell">{ticket.title}</td>
                        <td>
                          <span
                            className={`tk-badge ${categoryClass[ticket.category]}`}
                            title={translateCategory(ticket.category)}
                          >
                            {categoryShortLabel[ticket.category]}
                          </span>
                        </td>
                        <td>{ticket.userEmail ?? "—"}</td>
                        <td className="tk-date-cell">
                          {formatDate(ticket.createdAt)}
                        </td>
                        <td>
                          <span
                            className={`tk-badge tk-status ${getStatusBadgeClass(ticket.status)}`}
                          >
                            {translateStatus(ticket.status)}
                          </span>
                        </td>
                        <td>
                          <div className="tk-actions">
                            <button
                              type="button"
                              className="tk-icon-btn"
                              title="Visualizar"
                              aria-label={`Visualizar ${ticket.code}`}
                              onClick={() => setViewTicket(ticket)}
                            >
                              {Icons.eye()}
                            </button>

                            {isOpen && (
                              <>
                                <button
                                  type="button"
                                  className="tk-icon-btn"
                                  title="Editar"
                                  aria-label={`Editar ${ticket.code}`}
                                  onClick={() => openEdit(ticket)}
                                >
                                  {Icons.pencil()}
                                </button>
                                <button
                                  type="button"
                                  className="tk-icon-btn tk-danger"
                                  title="Excluir"
                                  aria-label={`Excluir ${ticket.code}`}
                                  onClick={() => setDeleteTarget(ticket)}
                                >
                                  {Icons.trash()}
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              className="tk-status-trigger"
                              title="Alterar status"
                              aria-label={`Alterar status de ${ticket.code}`}
                              aria-haspopup="menu"
                              disabled={updatingId === ticket.id}
                              onClick={(e) => openStatusMenu(ticket, e)}
                            >
                              {updatingId === ticket.id ? (
                                <span className="tk-spinner tk-spinner-sm" />
                              ) : (
                                Icons.refresh(15)
                              )}
                              {Icons.chevron(12)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="tickets-layout">
      <Sidebar />

      <main className="tickets-main">
        <div className="tickets-container">
          <header className="tickets-header">
            <div>
              <h1>Solicitações</h1>
              <p>Gerencie e acompanhe todas as solicitações.</p>
            </div>
            <button
              type="button"
              className="tk-btn tk-btn-primary"
              onClick={openCreate}
            >
              {Icons.plus(16)}
              <span>Nova Solicitação</span>
            </button>
          </header>

          {renderContent()}
        </div>
      </main>

      {/* Menu de status */}
      {statusMenu && (
        <div
          className="tk-status-menu"
          role="menu"
          style={{ top: statusMenu.top, right: statusMenu.right }}
        >
          <span className="tk-status-menu-title">Alterar status para</span>
          {statuses.map((status) => {
            const current = statusMenu.ticket.status === status;
            return (
              <button
                key={status}
                type="button"
                role="menuitem"
                className={`tk-status-option ${current ? "current" : ""}`}
                disabled={current}
                onClick={() => handleChangeStatus(statusMenu.ticket, status)}
              >
                <span
                  className={`tk-badge tk-status ${getStatusBadgeClass(status)}`}
                >
                  {translateStatus(status)}
                </span>
                {current && Icons.check(14)}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {formModal && (
        <Modal
          title={
            formModal.mode === "create"
              ? "Nova solicitação"
              : "Editar solicitação"
          }
          onClose={closeFormModal}
          closeOnOverlay={false}
          footer={
            <>
              <button
                type="button"
                className="tk-btn tk-btn-ghost"
                onClick={closeFormModal}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="ticket-form"
                className="tk-btn tk-btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? "Salvando..."
                  : formModal.mode === "create"
                    ? "Criar solicitação"
                    : "Salvar alterações"}
              </button>
            </>
          }
        >
          <form
            id="ticket-form"
            className="tk-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="tk-field">
              <label htmlFor="form-title">Título</label>
              <input
                id="form-title"
                type="text"
                placeholder="Ex.: Configuração de VPN para acesso remoto"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="tk-field">
              <label htmlFor="form-category">Categoria</label>
              <select
                id="form-category"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    category: e.target.value as TicketCategoryEnum | "",
                  }))
                }
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {translateCategory(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-field">
              <label htmlFor="form-description">Descrição</label>
              <textarea
                id="form-description"
                rows={5}
                placeholder="Descreva a solicitação com o máximo de detalhes possível."
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            {formError && (
              <p className="tk-form-error" role="alert">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}

      {/* Modal visualizar */}
      {viewTicket && (
        <Modal
          title={`Solicitação ${viewTicket.code}`}
          onClose={() => setViewTicket(null)}
          footer={
            <button
              type="button"
              className="tk-btn tk-btn-ghost"
              onClick={() => setViewTicket(null)}
            >
              Fechar
            </button>
          }
        >
          <dl className="tk-details">
            <div className="tk-details-wide">
              <dt>Título</dt>
              <dd className="tk-details-title">{viewTicket.title}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>
                <span
                  className={`tk-badge ${categoryClass[viewTicket.category]}`}
                >
                  {translateCategory(viewTicket.category)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`tk-badge tk-status ${getStatusBadgeClass(viewTicket.status)}`}
                >
                  {translateStatus(viewTicket.status)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Solicitante</dt>
              <dd>{viewTicket.userEmail ?? "—"}</dd>
            </div>
            <div>
              <dt>Data de abertura</dt>
              <dd>{formatDateTime(viewTicket.createdAt)}</dd>
            </div>
            <div className="tk-details-wide">
              <dt>Descrição</dt>
              <dd className="tk-details-description">
                {viewTicket.description}
              </dd>
            </div>
          </dl>
        </Modal>
      )}

      {/* Modal excluir */}
      {deleteTarget && (
        <Modal
          title="Excluir solicitação"
          small
          onClose={() => !deleting && setDeleteTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="tk-btn tk-btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="tk-btn tk-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </>
          }
        >
          <p className="tk-confirm-text">
            Tem certeza que deseja excluir a solicitação{" "}
            <strong>{deleteTarget.code}</strong> ({deleteTarget.title})? Essa
            ação não pode ser desfeita.
          </p>
        </Modal>
      )}

      {/* Aviso */}
      {toast && (
        <div className={`tk-toast ${toast.type}`} role="status">
          {toast.type === "success" ? Icons.check(16) : Icons.alert(16)}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Tickets;

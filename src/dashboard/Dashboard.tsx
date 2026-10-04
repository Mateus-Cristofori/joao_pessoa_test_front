import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { api } from "../api/api";

import {
  type DashboardSummaryResponse,
  type TicketCategoryEnum,
  getStatusBadgeClass,
  translateCategory,
  translateStatus,
} from "../types/types";
import "./Dashboard.css";
import Sidebar from "../components/sidebar/SideBar";
import { Icons } from "./Icons";

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

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

const Dashboard = () => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<DashboardSummaryResponse>("/dashboard", {
        signal,
      });

      setData({
        ...response.data,
        recentToday: response.data.recentToday ?? [],
        byCategory: response.data.byCategory ?? [],
      });
    } catch (err) {
      if (axios.isCancel(err)) return;

      if (axios.isAxiosError(err) && !err.response) {
        setError(
          "Não foi possível conectar ao servidor. Verifique se o backend está em execução.",
        );
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Sessão expirada. Faça login novamente.");
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError("Você não tem permissão para visualizar o dashboard.");
      } else {
        setError("Não foi possível carregar os dados do dashboard.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const isEmpty = data !== null && data.total === 0;
  const maxCount = data
    ? Math.max(...data.byCategory.map((c) => c.count), 1)
    : 1;

  const stats = data
    ? [
        {
          label: "Total de solicitações",
          value: data.total,
          icon: Icons.inbox(20),
          tone: "stat-neutral",
        },
        {
          label: "Abertas",
          value: data.open,
          icon: Icons.clock(20),
          tone: "stat-blue",
        },
        {
          label: "Em atendimento",
          value: data.inProgress,
          icon: Icons.loader(20),
          tone: "stat-amber",
        },
        {
          label: "Concluídas",
          value: data.completed,
          icon: Icons.check(20),
          tone: "stat-green",
          hint: `${Math.round(data.completionRate)}% de conclusão`,
        },
      ]
    : [];

  const renderContent = () => {
    /* Carregando */
    if (loading && !data) {
      return (
        <section className="state-loading" aria-live="polite" aria-busy="true">
          <div className="spinner" />
          <p>Carregando dados do dashboard...</p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="empty-state" role="alert">
          <div className="empty-icon error">{Icons.alert(36)}</div>
          <h2>Algo deu errado</h2>
          <p>{error}</p>
          <button
            type="button"
            className="empty-action"
            onClick={() => loadDashboard()}
          >
            {Icons.refresh(16)}
            <span>Tentar novamente</span>
          </button>
        </section>
      );
    }

    if (!data) return null;

    if (isEmpty) {
      return (
        <section className="empty-state" aria-live="polite">
          <div className="empty-icon">{Icons.inbox(36)}</div>
          <h2>Nenhuma solicitação por aqui ainda</h2>
          <p>
            Assim que as solicitações forem criadas, você verá aqui os totais,
            as mais recentes e a distribuição por categoria.
          </p>
          <Link to="/solicitacoes" className="empty-action">
            {Icons.plus(16)}
            <span>Criar primeira solicitação</span>
          </Link>
        </section>
      );
    }

    return (
      <>
        {/* Cards de resumo */}
        <section className="stats-grid">
          {stats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <strong className="stat-value">{stat.value}</strong>
                {stat.hint && <span className="stat-hint">{stat.hint}</span>}
              </div>
              <div className={`stat-icon ${stat.tone}`}>{stat.icon}</div>
            </article>
          ))}
        </section>

        <section className="panels-grid">
          {/* Solicitações recentes */}
          <article className="panel">
            <div className="panel-header">
              <h2>Solicitações recentes</h2>
              <Link to="/tickets" className="panel-link">
                Ver todas
              </Link>
            </div>

            {data.recentToday.length === 0 ? (
              <div className="panel-empty">
                <p>Nenhuma solicitação recente.</p>
              </div>
            ) : (
              <ul className="recent-list">
                {data.recentToday.map((ticket) => (
                  <li key={ticket.id} className="recent-item">
                    <div className="recent-main">
                      <div className="recent-meta">
                        <span className="ticket-code">{ticket.code}</span>
                        <span
                          className={`cat-badge ${categoryClass[ticket.category]}`}
                          title={translateCategory(ticket.category)}
                        >
                          {categoryShortLabel[ticket.category]}
                        </span>
                      </div>
                      <strong className="recent-title">{ticket.title}</strong>
                      <span className="recent-sub">
                        {ticket.requester} · {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`status-badge ${getStatusBadgeClass(ticket.status)}`}
                    >
                      {translateStatus(ticket.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Por categoria */}
          <article className="panel">
            <div className="panel-header">
              <h2>Por categoria</h2>
            </div>

            {data.byCategory.length === 0 ? (
              <div className="panel-empty">
                <p>Sem dados de categoria.</p>
              </div>
            ) : (
              <div className="category-body">
                <ul className="category-list">
                  {data.byCategory.map((item) => (
                    <li key={item.category} className="category-item">
                      <div className="category-row">
                        <span
                          className={`cat-badge ${categoryClass[item.category]}`}
                          title={translateCategory(item.category)}
                        >
                          {categoryShortLabel[item.category]}
                        </span>
                        <span className="category-count">{item.count}</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="category-footnote">
                  {Icons.trending(14)}
                  <span>Distribuição baseada em {data.total} solicitações</span>
                </p>
              </div>
            )}
          </article>
        </section>
      </>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="dashboard">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Visão geral das solicitações do sistema.</p>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;

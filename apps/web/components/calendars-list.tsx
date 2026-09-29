"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiUser
} from "react-icons/fi";
import type { CalendarStage, Client } from "../lib/api";

const PAGE_SIZE = 8;

type CalendarFilter =
  | "ACTIVE"
  | "ALL"
  | "PLANNING"
  | "PRE_APPROVAL"
  | "PRODUCTION"
  | "FINAL_APPROVAL"
  | "SCHEDULING"
  | "COMPLETED"
  | "ARCHIVED";

const stageLabel: Record<CalendarStage, string> = {
  PLANNING: "Planejamento",
  PRE_APPROVAL: "Pré-aprovação",
  PRODUCTION: "Produção",
  FINAL_APPROVAL: "Aprovação da arte",
  SCHEDULING: "Programação",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado"
};

const stageProgress: Record<CalendarStage, number> = {
  PLANNING: 12,
  PRE_APPROVAL: 30,
  PRODUCTION: 50,
  FINAL_APPROVAL: 70,
  SCHEDULING: 88,
  COMPLETED: 100,
  ARCHIVED: 100
};

const readyStages = new Set([
  "ART_APPROVED",
  "READY_TO_SCHEDULE",
  "SCHEDULED",
  "PUBLISHED"
]);

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC"
  }).format(new Date(date)).replace(".", "").toUpperCase();
}

function periodLabel(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  });
  return `${formatter.format(new Date(start))} — ${formatter.format(new Date(end))}`;
}

export function CalendarsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("all");
  const [state, setState] = useState<CalendarFilter>("ACTIVE");
  const [page, setPage] = useState(1);

  const calendars = useMemo(
    () =>
      clients.flatMap((client) =>
        client.calendars.map((calendar) => ({ ...calendar, client }))
      ),
    [clients]
  );

  const summary = useMemo(() => {
    const active = calendars.filter((calendar) => calendar.stage !== "ARCHIVED");
    return {
      active: active.length,
      approvals: active.filter((calendar) =>
        ["PRE_APPROVAL", "FINAL_APPROVAL"].includes(calendar.stage)
      ).length,
      production: active.filter((calendar) => calendar.stage === "PRODUCTION").length,
      completed: calendars.filter((calendar) => calendar.stage === "COMPLETED").length
    };
  }, [calendars]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return calendars
      .filter((calendar) => {
        const matchesQuery =
          !normalizedQuery ||
          calendar.title.toLowerCase().includes(normalizedQuery) ||
          calendar.client.name.toLowerCase().includes(normalizedQuery);
        const matchesClient =
          clientId === "all" || calendar.client.id === clientId;
        const matchesState =
          state === "ALL" ||
          (state === "ACTIVE" && calendar.stage !== "ARCHIVED") ||
          calendar.stage === state;

        return matchesQuery && matchesClient && matchesState;
      })
      .sort(
        (a, b) =>
          new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );
  }, [calendars, clientId, query, state]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="calendar-showcase">
      <div className="calendar-showcase-summary">
        <article>
          <span className="calendar-summary-icon"><FiCalendar /></span>
          <div><strong>{summary.active}</strong><small>Fluxos ativos</small></div>
        </article>
        <article>
          <span className="calendar-summary-icon"><FiClock /></span>
          <div><strong>{summary.approvals}</strong><small>Em aprovação</small></div>
        </article>
        <article>
          <span className="calendar-summary-icon"><FiUser /></span>
          <div><strong>{summary.production}</strong><small>Em produção</small></div>
        </article>
        <article>
          <span className="calendar-summary-icon"><FiCheckCircle /></span>
          <div><strong>{summary.completed}</strong><small>Concluídos</small></div>
        </article>
      </div>

      <div className="calendar-showcase-toolbar">
        <label className="search-control calendar-showcase-search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Buscar calendário ou cliente..."
            aria-label="Buscar calendários"
          />
        </label>

        <select
          className="filter-select"
          value={clientId}
          onChange={(event) => {
            setClientId(event.target.value);
            resetPage();
          }}
          aria-label="Filtrar por cliente"
        >
          <option value="all">Todos os clientes</option>
          {clients.map((client) => (
            <option value={client.id} key={client.id}>{client.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={state}
          onChange={(event) => {
            setState(event.target.value as CalendarFilter);
            resetPage();
          }}
          aria-label="Filtrar por etapa"
        >
          <option value="ACTIVE">Fluxos ativos</option>
          <option value="ALL">Todas as etapas</option>
          <option value="PLANNING">Planejamento</option>
          <option value="PRE_APPROVAL">Pré-aprovação</option>
          <option value="PRODUCTION">Produção</option>
          <option value="FINAL_APPROVAL">Aprovação da arte</option>
          <option value="SCHEDULING">Programação</option>
          <option value="COMPLETED">Concluídos</option>
          <option value="ARCHIVED">Arquivados</option>
        </select>

        <span className="calendar-showcase-count">{filtered.length} calendário(s)</span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Nenhum calendário encontrado com esses filtros.
        </div>
      ) : (
        <div className="calendar-showcase-grid">
          {visible.map((calendar) => {
            const currentStage = calendar.archivedAt ? "ARCHIVED" : calendar.stage;
            const total = calendar.contentItems.length;
            const ready = calendar.contentItems.filter((item) =>
              readyStages.has(item.stage)
            ).length;

            return (
              <Link
                href={`/calendars/${calendar.id}`}
                className={`calendar-showcase-card${currentStage === "ARCHIVED" ? " is-archived" : ""}`}
                key={calendar.id}
              >
                <div className="calendar-showcase-card-top">
                  <div className="calendar-showcase-month">
                    <span>{monthLabel(calendar.periodStart)}</span>
                    <strong>{new Date(calendar.periodStart).getUTCFullYear()}</strong>
                  </div>
                  <span className={`calendar-stage-chip stage-${currentStage.toLowerCase()}`}>
                    {stageLabel[currentStage]}
                  </span>
                </div>

                <div className="calendar-showcase-client">{calendar.client.name}</div>
                <h3>{calendar.title}</h3>
                <p className="calendar-showcase-period">{periodLabel(calendar.periodStart, calendar.periodEnd)}</p>

                <div className="calendar-showcase-metrics">
                  <span><strong>{total}</strong><small>Publicações</small></span>
                  <span><strong>{ready}</strong><small>Artes prontas</small></span>
                  <span>
                    <strong>{calendar.postingDays.length}</strong>
                    <small>Dias planejados</small>
                  </span>
                </div>

                <div className="calendar-showcase-progress">
                  <div>
                    <span style={{ width: `${stageProgress[currentStage]}%` }} />
                  </div>
                  <small>{stageProgress[currentStage]}% do fluxo</small>
                </div>

                <div className="calendar-showcase-footer">
                  <span>
                    <FiUser aria-hidden="true" />
                    {calendar.client.assignedDesigner?.name ?? "Sem responsável"}
                  </span>
                  <span className="calendar-showcase-open">
                    Abrir <FiArrowUpRight aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <nav className="pagination" aria-label="Paginação de calendários">
          <button
            type="button"
            className="pagination-button"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Página anterior"
          >
            <FiChevronLeft />
          </button>
          <span>Página <strong>{safePage}</strong> de {pageCount}</span>
          <button
            type="button"
            className="pagination-button"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage === pageCount}
            aria-label="Próxima página"
          >
            <FiChevronRight />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

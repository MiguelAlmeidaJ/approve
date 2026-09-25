"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiSearch
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

export function CalendarsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("all");
  const [state, setState] = useState<CalendarFilter>("ACTIVE");
  const [page, setPage] = useState(1);

  const calendars = useMemo(
    () =>
      clients.flatMap((client) =>
        client.calendars.map((calendar) => ({
          ...calendar,
          client
        }))
      ),
    [clients]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return calendars.filter((calendar) => {
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
    });
  }, [calendars, clientId, query, state]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function resetPage() {
    setPage(1);
  }

  return (
    <>
      <div className="list-toolbar list-toolbar-calendar">
        <label className="search-control">
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
            <option value={client.id} key={client.id}>
              {client.name}
            </option>
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

        <span className="list-result-count">
          {filtered.length} resultado(s)
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Nenhum calendário encontrado com esses filtros.
        </div>
      ) : (
        <div className="calendar-list-simple">
          {visible.map((calendar) => {
            const total = calendar.contentItems.length;
            const currentStage = calendar.archivedAt
              ? "ARCHIVED"
              : calendar.stage;

            return (
              <Link
                href={`/calendars/${calendar.id}`}
                className={
                  currentStage === "ARCHIVED"
                    ? "calendar-row calendar-row-archived"
                    : "calendar-row"
                }
                key={calendar.id}
              >
                <div className="calendar-month-block">
                  <span>
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "short",
                      timeZone: "UTC"
                    })
                      .format(new Date(calendar.periodStart))
                      .replace(".", "")
                      .toUpperCase()}
                  </span>
                  <strong>
                    {new Date(calendar.periodStart).getUTCFullYear()}
                  </strong>
                </div>

                <div className="calendar-row-main">
                  <h3>{calendar.title}</h3>
                  <p>
                    {calendar.client.name} · {total} publicação(ões)
                  </p>
                </div>

                <div className="calendar-stage-cell">
                  <span className={`calendar-stage-chip stage-${currentStage.toLowerCase()}`}>
                    {stageLabel[currentStage]}
                  </span>
                  <small>
                    {calendar.client.assignedDesigner?.name ??
                      "Sem designer responsável"}
                  </small>
                </div>

                <div className="calendar-progress">
                  <div>
                    <span
                      style={{
                        width: `${stageProgress[currentStage]}%`
                      }}
                    />
                  </div>
                  <small>{stageProgress[currentStage]}%</small>
                </div>

                <FiArrowRight className="arrow-link" aria-hidden="true" />
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

          <span>
            Página <strong>{safePage}</strong> de {pageCount}
          </span>

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
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiSearch
} from "react-icons/fi";
import type { Client } from "../lib/api";

const PAGE_SIZE = 8;

type CalendarState = "all" | "pending" | "approved" | "changes";

function getCalendarState(client: Client, calendarId: string) {
  const calendar = client.calendars.find((item) => item.id === calendarId);

  if (!calendar || calendar.contentItems.length === 0) {
    return "pending";
  }

  if (
    calendar.contentItems.some(
      (item) => item.status === "CHANGES_REQUESTED"
    )
  ) {
    return "changes";
  }

  if (
    calendar.contentItems.every((item) => item.status === "APPROVED")
  ) {
    return "approved";
  }

  return "pending";
}

export function CalendarsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("all");
  const [state, setState] = useState<CalendarState>("all");
  const [page, setPage] = useState(1);

  const calendars = useMemo(
    () =>
      clients.flatMap((client) =>
        client.calendars.map((calendar) => ({
          ...calendar,
          client,
          state: getCalendarState(client, calendar.id)
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
        state === "all" || calendar.state === state;

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
            setState(event.target.value as CalendarState);
            resetPage();
          }}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Em aprovação</option>
          <option value="approved">Concluídos</option>
          <option value="changes">Com alterações</option>
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
            const approved = calendar.contentItems.filter(
              (item) => item.status === "APPROVED"
            ).length;

            return (
              <Link
                href={`/calendars/${calendar.id}`}
                className="calendar-row"
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
                    {calendar.client.name} · {calendar.contentItems.length} peça(s)
                  </p>
                </div>

                <div className="calendar-progress">
                  <div>
                    <span
                      style={{
                        width:
                          calendar.contentItems.length === 0
                            ? "0%"
                            : `${Math.round(
                                (approved / calendar.contentItems.length) * 100
                              )}%`
                      }}
                    />
                  </div>
                  <small>
                    {approved}/{calendar.contentItems.length}
                  </small>
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

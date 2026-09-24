"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiMail,
  FiPhone,
  FiSearch,
  FiUser
} from "react-icons/fi";
import type { Client } from "../lib/api";

const PAGE_SIZE = 6;

export function ClientsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [assignment, setAssignment] = useState("all");
  const [niche, setNiche] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const niches = useMemo(
    () =>
      [...new Set(
        clients
          .map((client) => client.niche?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort((first, second) => first.localeCompare(second, "pt-BR")),
    [clients]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesQuery =
        !normalizedQuery ||
        client.name.toLowerCase().includes(normalizedQuery) ||
        client.niche?.toLowerCase().includes(normalizedQuery) ||
        client.phone?.toLowerCase().includes(normalizedQuery) ||
        client.credential?.email.toLowerCase().includes(normalizedQuery) ||
        client.assignedDesigner?.name.toLowerCase().includes(normalizedQuery);

      const matchesAssignment =
        assignment === "all" ||
        (assignment === "assigned" && Boolean(client.assignedDesignerId)) ||
        (assignment === "unassigned" && !client.assignedDesignerId);

      const matchesNiche = niche === "all" || client.niche === niche;
      const matchesStatus =
        status === "all" ||
        (status === "active" && client.active) ||
        (status === "inactive" && !client.active);

      return (
        matchesQuery &&
        matchesAssignment &&
        matchesNiche &&
        matchesStatus
      );
    });
  }, [assignment, clients, niche, query, status]);

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
      <div className="client-list-toolbar">
        <label className="search-control client-search">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Buscar por cliente, nicho, contato ou designer..."
            aria-label="Buscar clientes"
          />
        </label>

        <select
          className="filter-select"
          value={niche}
          onChange={(event) => {
            setNiche(event.target.value);
            resetPage();
          }}
          aria-label="Filtrar por nicho"
        >
          <option value="all">Todos os nichos</option>
          {niches.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={assignment}
          onChange={(event) => {
            setAssignment(event.target.value);
            resetPage();
          }}
          aria-label="Filtrar por responsável"
        >
          <option value="all">Todos os responsáveis</option>
          <option value="assigned">Com designer</option>
          <option value="unassigned">Sem designer</option>
        </select>

        <select
          className="filter-select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            resetPage();
          }}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>

        <span className="list-result-count">
          {filtered.length} resultado(s)
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Nenhum cliente encontrado com esses filtros.
        </div>
      ) : (
        <div className="client-directory-grid">
          {visible.map((client) => {
            const activeCalendars = client.calendars.filter(
              (calendar) => !calendar.archivedAt
            ).length;

            return (
              <article
                className={
                  client.active
                    ? "client-directory-card"
                    : "client-directory-card is-inactive"
                }
                key={client.id}
              >
                <div className="client-directory-head">
                  <div className="client-card-avatar">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="client-card-heading">
                    <span className="client-niche-chip">
                      <FiBriefcase aria-hidden="true" />
                      {client.niche || "Nicho não informado"}
                    </span>
                    <h3>
                      {client.name}
                      {!client.active ? (
                        <span className="inline-inactive-chip">Inativo</span>
                      ) : null}
                    </h3>
                  </div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="client-open-icon"
                    aria-label={`Abrir ${client.name}`}
                    title="Abrir cliente"
                  >
                    <FiEye aria-hidden="true" />
                  </Link>
                </div>

                <div className="client-contact-list">
                  <span>
                    <FiMail aria-hidden="true" />
                    {client.credential?.email || "Acesso ainda não configurado"}
                  </span>
                  <span>
                    <FiPhone aria-hidden="true" />
                    {client.phone || "Telefone não informado"}
                  </span>
                </div>

                <div className="client-directory-footer">
                  <div>
                    <FiUser aria-hidden="true" />
                    <span>
                      <small>Responsável</small>
                      <strong>
                        {client.assignedDesigner?.name ?? "Sem responsável"}
                      </strong>
                    </span>
                  </div>
                  <div className="client-calendar-count">
                    <strong>{activeCalendars}</strong>
                    <span>calendário(s)</span>
                  </div>
                </div>

                <div className="client-directory-actions">
                  <Link
                    href={`/clients/${client.id}`}
                    className="client-action-button primary"
                  >
                    <FiEye aria-hidden="true" />
                    Abrir
                  </Link>
                  <Link
                    href={`/clients/${client.id}/edit`}
                    className="client-action-button"
                  >
                    <FiEdit3 aria-hidden="true" />
                    Editar
                  </Link>
                  {client.active ? (
                    <Link
                      href={`/calendars/new?client=${client.id}`}
                      className="client-action-button"
                    >
                      <FiCalendar aria-hidden="true" />
                      Calendário
                    </Link>
                  ) : (
                    <span className="client-action-button disabled">
                      <FiCalendar aria-hidden="true" />
                      Inativo
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        onPageChange={setPage}
      />
    </>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  onPageChange
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= PAGE_SIZE) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Paginação de clientes">
      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <FiChevronLeft />
      </button>

      <span>
        Página <strong>{page}</strong> de {pageCount}
      </span>

      <button
        type="button"
        className="pagination-button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Próxima página"
      >
        <FiChevronRight />
      </button>
    </nav>
  );
}

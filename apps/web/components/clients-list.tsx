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

const PAGE_SIZE = 6;

export function ClientsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [assignment, setAssignment] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesQuery =
        !normalizedQuery ||
        client.name.toLowerCase().includes(normalizedQuery) ||
        client.assignedDesigner?.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        client.assignedDesigner?.email
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesAssignment =
        assignment === "all" ||
        (assignment === "assigned" && Boolean(client.assignedDesignerId)) ||
        (assignment === "unassigned" && !client.assignedDesignerId);

      return matchesQuery && matchesAssignment;
    });
  }, [assignment, clients, query]);

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
      <div className="list-toolbar">
        <label className="search-control">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Buscar cliente ou designer..."
            aria-label="Buscar clientes"
          />
        </label>

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

        <span className="list-result-count">
          {filtered.length} resultado(s)
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Nenhum cliente encontrado com esses filtros.
        </div>
      ) : (
        <div className="client-card-grid">
          {visible.map((client) => (
            <Link
              href={`/clients/${client.id}`}
              className="client-card"
              key={client.id}
            >
              <div className="client-card-top">
                <div className="client-card-avatar">
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                <FiArrowRight className="arrow-link" aria-hidden="true" />
              </div>

              <div>
                <h3>{client.name}</h3>
                <p>
                  {client.calendars.length} calendário(s) ·{" "}
                  {client.assignedDesigner?.name ?? "sem responsável"}
                </p>
              </div>

              <span className="latest-calendar">
                {client.assignedDesigner
                  ? client.assignedDesigner.email
                  : "Atribua um designer responsável"}
              </span>
            </Link>
          ))}
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

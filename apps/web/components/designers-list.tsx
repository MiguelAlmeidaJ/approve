"use client";

import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch
} from "react-icons/fi";
import type { DesignerListItem } from "../lib/api";

const PAGE_SIZE = 8;

export function DesignersList({
  designers
}: {
  designers: DesignerListItem[];
}) {
  const [query, setQuery] = useState("");
  const [workload, setWorkload] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return designers.filter((designer) => {
      const matchesQuery =
        !normalizedQuery ||
        designer.name.toLowerCase().includes(normalizedQuery) ||
        designer.email.toLowerCase().includes(normalizedQuery);

      const matchesWorkload =
        workload === "all" ||
        (workload === "with-clients" && designer._count.clients > 0) ||
        (workload === "without-clients" && designer._count.clients === 0);

      return matchesQuery && matchesWorkload;
    });
  }, [designers, query, workload]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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
              setPage(1);
            }}
            placeholder="Buscar designer..."
            aria-label="Buscar designers"
          />
        </label>

        <select
          className="filter-select"
          value={workload}
          onChange={(event) => {
            setWorkload(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por clientes atribuídos"
        >
          <option value="all">Todos</option>
          <option value="with-clients">Com clientes</option>
          <option value="without-clients">Sem clientes</option>
        </select>

        <span className="list-result-count">
          {filtered.length} resultado(s)
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Nenhum designer encontrado com esses filtros.
        </div>
      ) : (
        <div className="designer-grid">
          {visible.map((item) => (
            <article className="designer-card" key={item.id}>
              <div className="designer-card-avatar">
                {item.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.email}</p>
              </div>
              <span className="role-chip">designer</span>
              <strong>{item._count.clients}</strong>
              <small>cliente(s) atribuído(s)</small>
            </article>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <nav className="pagination" aria-label="Paginação de designers">
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

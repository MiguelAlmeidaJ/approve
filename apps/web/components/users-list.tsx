"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiSearch,
} from "react-icons/fi";
import type { UserListItem, UserRole } from "../lib/api";

const PAGE_SIZE = 8;

const roleLabel: Record<UserRole, string> = {
  DEV: "Dev",
  ADMIN: "Admin",
  DESIGNER: "Designer",
};

const roleOptions: Array<{ value: UserRole | "ALL"; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "DESIGNER", label: "Designers" },
  { value: "ADMIN", label: "Admins" },
  { value: "DEV", label: "Dev" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UsersList({
  users,
  canManage,
}: {
  users: UserListItem[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);

      return matchesQuery && (role === "ALL" || user.role === role);
    });
  }, [query, role, users]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <>
      <div className="team-list-toolbar">
        <label className="search-control">
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar na equipe..."
            aria-label="Buscar pessoas na equipe"
          />
        </label>

        <div
          className="team-role-filter"
          role="group"
          aria-label="Filtrar equipe por perfil"
        >
          {roleOptions.map((option) => (
            <button
              type="button"
              className={role === option.value ? "active" : ""}
              onClick={() => {
                setRole(option.value);
                setPage(1);
              }}
              aria-pressed={role === option.value}
              key={option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        <span className="team-result-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="filtered-empty">
          Ninguém da equipe foi encontrado com esses filtros.
        </div>
      ) : (
        <div className="user-grid">
          {visible.map((user) => (
            <article
              className={canManage ? "user-card can-manage" : "user-card"}
              key={user.id}
            >
              <div
                className={`user-card-avatar role-bg-${user.role.toLowerCase()}`}
              >
                {initials(user.name) || "TA"}
              </div>
              <div className="user-card-copy">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
              <span
                className={`role-chip role-chip-${user.role.toLowerCase()}`}
              >
                {roleLabel[user.role]}
              </span>
              <div className="user-card-access">
                <span />
                Acesso ativo
              </div>
              <div className="user-card-context">
                <strong>
                  {user.role === "DESIGNER"
                    ? user._count.clients
                    : user.role === "ADMIN"
                      ? "Gestão"
                      : "Tech"}
                </strong>
                <small>
                  {user.role === "DESIGNER" ? "clientes" : "acesso geral"}
                </small>
              </div>
              {canManage ? (
                <Link
                  href={`/equipe?edit=${user.id}`}
                  className="icon-button"
                  aria-label={`Editar membro ${user.name}`}
                  title="Editar membro"
                  scroll={false}
                >
                  <FiEdit3 aria-hidden="true" />
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <nav className="pagination" aria-label="Paginação da equipe">
          <button
            type="button"
            className="pagination-button"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Página anterior"
          >
            <FiChevronLeft aria-hidden="true" />
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
            <FiChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </>
  );
}

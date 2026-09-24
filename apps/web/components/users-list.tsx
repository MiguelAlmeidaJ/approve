"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiLock,
  FiMail,
  FiSearch,
  FiShield,
  FiUser,
} from "react-icons/fi";
import type { UserListItem, UserRole } from "../lib/api";

const PAGE_SIZE = 8;

const roleLabel: Record<UserRole, string> = {
  DEV: "Dev",
  ADMIN: "Admin",
  DESIGNER: "Designer",
};

const roleDescription: Record<UserRole, string> = {
  DEV: "Acesso total e configurações",
  ADMIN: "Gestão da operação",
  DESIGNER: "Clientes e calendários atribuídos",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .replace(".", "");
}

export function UsersList({
  users,
  currentRole,
}: {
  users: UserListItem[];
  currentRole: "DEV" | "ADMIN";
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const roleOptions: Array<{ value: UserRole | "ALL"; label: string }> = [
    { value: "ALL", label: "Todos" },
    { value: "DESIGNER", label: "Designers" },
    { value: "ADMIN", label: "Admins" },
    ...(currentRole === "DEV"
      ? [{ value: "DEV" as const, label: "Dev" }]
      : []),
  ];

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
            placeholder="Buscar por nome ou e-mail..."
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
        <div className="user-grid team-user-list">
          {visible.map((user) => {
            const editable =
              currentRole === "DEV" || user.role === "DESIGNER";

            return (
              <article className="user-card team-user-row" key={user.id}>
                <div
                  className={`user-card-avatar role-bg-${user.role.toLowerCase()}`}
                >
                  {initials(user.name) || "TA"}
                </div>

                <div className="user-card-copy">
                  <h3>{user.name}</h3>
                  <p>
                    <FiMail aria-hidden="true" />
                    {user.email}
                  </p>
                  <span className="user-role-description">
                    {roleDescription[user.role]}
                  </span>
                </div>

                <div className="team-user-role">
                  <span
                    className={`role-chip role-chip-${user.role.toLowerCase()}`}
                  >
                    {roleLabel[user.role]}
                  </span>
                  <small>Acesso ativo</small>
                </div>

                <div className="team-user-metric">
                  {user.role === "DESIGNER" ? (
                    <FiBriefcase aria-hidden="true" />
                  ) : (
                    <FiShield aria-hidden="true" />
                  )}
                  <span>
                    <strong>
                      {user.role === "DESIGNER"
                        ? user._count.clients
                        : user.role === "ADMIN"
                          ? "Gestão"
                          : "Total"}
                    </strong>
                    <small>
                      {user.role === "DESIGNER"
                        ? "cliente(s)"
                        : "nível de acesso"}
                    </small>
                  </span>
                </div>

                <div className="team-user-created">
                  <FiUser aria-hidden="true" />
                  <span>
                    <small>Na equipe desde</small>
                    <strong>{formatCreatedAt(user.createdAt)}</strong>
                  </span>
                </div>

                {editable ? (
                  <Link
                    href={`/equipe?edit=${user.id}`}
                    className="team-user-edit"
                    aria-label={`Editar membro ${user.name}`}
                    title="Editar membro"
                    scroll={false}
                  >
                    <FiEdit3 aria-hidden="true" />
                    Editar
                  </Link>
                ) : (
                  <span
                    className="team-user-locked"
                    title="Este perfil só pode ser gerenciado por um usuário dev"
                  >
                    <FiLock aria-hidden="true" />
                    Somente dev
                  </span>
                )}
              </article>
            );
          })}
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

import Link from "next/link";
import { logoutDesigner } from "../app/actions";
import type { Designer } from "../lib/api";
import { Brand } from "./brand";

export type AppSection =
  | "panel"
  | "calendars"
  | "clients"
  | "designers"
  | "config";

const roleLabel = {
  DEV: "dev",
  ADMIN: "admin",
  DESIGNER: "designer"
} as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  designer,
  activeSection = "panel",
  children
}: {
  designer: Designer;
  activeSection?: AppSection;
  children: React.ReactNode;
}) {
  const canSeeDesigners =
    designer.role === "ADMIN" || designer.role === "DEV";
  const canSeeConfig = designer.role === "DEV";

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
          <span>aprovação</span>
        </div>

        <nav className="sidebar-nav main-menu" aria-label="Navegação principal">
          <Link
            href="/"
            className={activeSection === "panel" ? "nav-link active" : "nav-link"}
          >
            <span className="nav-icon">●</span>
            Painel
          </Link>

          <Link
            href="/calendars"
            className={
              activeSection === "calendars" ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">▦</span>
            Calendário
          </Link>

          <Link
            href="/clients"
            className={
              activeSection === "clients" ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">□</span>
            Clientes
          </Link>

          {canSeeDesigners ? (
            <Link
              href="/designers"
              className={
                activeSection === "designers" ? "nav-link active" : "nav-link"
              }
            >
              <span className="nav-icon">◇</span>
              Designers
            </Link>
          ) : null}

          {canSeeConfig ? (
            <>
              <div className="menu-divider" />
              <Link
                href="/config"
                className={
                  activeSection === "config" ? "nav-link active" : "nav-link"
                }
              >
                <span className="nav-icon">⚙</span>
                Config
              </Link>
            </>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="designer-avatar">
            {initials(designer.name) || "TA"}
          </div>
          <div className="designer-meta">
            <strong>{designer.name}</strong>
            <span>{designer.email}</span>
            <span className={`sidebar-role role-${designer.role.toLowerCase()}`}>
              {roleLabel[designer.role]}
            </span>
          </div>
          <form action={logoutDesigner}>
            <button
              type="submit"
              className="icon-button"
              aria-label="Sair"
              title="Sair"
            >
              ↗
            </button>
          </form>
        </div>
      </aside>

      <main className="workspace">{children}</main>
    </div>
  );
}

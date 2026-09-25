import Link from "next/link";
import {
  FiBell,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiLogOut,
  FiPieChart,
  FiSettings,
  FiSliders,
  FiStar,
  FiTool,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { logoutDesigner } from "../app/actions";
import type { Designer } from "../lib/api";
import { Brand } from "./brand";

export type AppSection =
  | "panel"
  | "calendars"
  | "clients"
  | "team"
  | "dates"
  | "production"
  | "templates"
  | "notifications"
  | "reports"
  | "formats"
  | "config";

const roleLabel = {
  DEV: "dev",
  ADMIN: "admin",
  DESIGNER: "designer",
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
  children,
}: {
  designer: Designer;
  activeSection?: AppSection;
  children: React.ReactNode;
}) {
  const canSeeUsers = designer.role === "ADMIN" || designer.role === "DEV";
  const canSeeFormats = designer.role === "ADMIN" || designer.role === "DEV";
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
            className={
              activeSection === "panel" ? "nav-link active" : "nav-link"
            }
          >
            <FiHome className="nav-icon" aria-hidden="true" />
            Painel
          </Link>

          <Link
            href="/calendars"
            className={
              activeSection === "calendars" ? "nav-link active" : "nav-link"
            }
          >
            <FiCalendar className="nav-icon" aria-hidden="true" />
            Calendário
          </Link>

          <Link
            href="/producao"
            className={
              activeSection === "production" ? "nav-link active" : "nav-link"
            }
          >
            <FiTool className="nav-icon" aria-hidden="true" />
            Produção
          </Link>

          <Link
            href="/notificacoes"
            className={
              activeSection === "notifications" ? "nav-link active" : "nav-link"
            }
          >
            <FiBell className="nav-icon" aria-hidden="true" />
            Notificações
          </Link>

          <Link
            href="/clients"
            className={
              activeSection === "clients" ? "nav-link active" : "nav-link"
            }
          >
            <FiUsers className="nav-icon" aria-hidden="true" />
            Clientes
          </Link>

          {canSeeUsers ? (
            <Link
              href="/equipe"
              className={
                activeSection === "team" ? "nav-link active" : "nav-link"
              }
            >
              <FiUserCheck className="nav-icon" aria-hidden="true" />
              Equipe
            </Link>
          ) : null}

          {canSeeFormats ? (
            <Link
              href="/modelos"
              className={
                activeSection === "templates" ? "nav-link active" : "nav-link"
              }
            >
              <FiClipboard className="nav-icon" aria-hidden="true" />
              Modelos
            </Link>
          ) : null}

          <Link
            href="/datas-comemorativas"
            className={
              activeSection === "dates" ? "nav-link active" : "nav-link"
            }
          >
            <FiStar className="nav-icon" aria-hidden="true" />
            Datas
          </Link>

          <Link
            href="/relatorios"
            className={
              activeSection === "reports" ? "nav-link active" : "nav-link"
            }
          >
            <FiPieChart className="nav-icon" aria-hidden="true" />
            Relatórios
          </Link>

          {canSeeFormats ? (
            <Link
              href="/formats"
              className={
                activeSection === "formats" ? "nav-link active" : "nav-link"
              }
            >
              <FiSliders className="nav-icon" aria-hidden="true" />
              Formatos
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
                <FiSettings className="nav-icon" aria-hidden="true" />
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
            <span
              className={`sidebar-role role-${designer.role.toLowerCase()}`}
            >
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
              <FiLogOut aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <main className="workspace">{children}</main>
    </div>
  );
}

import Link from "next/link";
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiFolder,
  FiHome,
  FiLogOut,
  FiPieChart,
  FiSettings,
  FiShield,
  FiSliders,
  FiStar,
  FiTrendingUp,
  FiTool,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { logoutDesigner } from "../app/actions";
import type { Designer } from "../lib/api";
import { Brand } from "./brand";

export type AppSection =
  | "panel"
  | "today"
  | "search"
  | "calendars"
  | "clients"
  | "team"
  | "dates"
  | "production"
  | "templates"
  | "notifications"
  | "reports"
  | "capacity"
  | "audit"
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

function groupIsActive(
  activeSection: AppSection,
  sections: AppSection[],
) {
  return sections.includes(activeSection);
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
            href="/meu-dia"
            className={
              activeSection === "today" ? "nav-link active" : "nav-link"
            }
          >
            <FiActivity className="nav-icon" aria-hidden="true" />
            Meu dia
          </Link>

          <details
            className="sidebar-menu-group"
            open={groupIsActive(activeSection, [
              "calendars",
              "production",
              "notifications",
            ])}
          >
            <summary>
              <span>
                <FiFolder className="nav-icon" aria-hidden="true" />
                Operação
              </span>
              <FiChevronDown
                className="sidebar-menu-chevron"
                aria-hidden="true"
              />
            </summary>
            <div className="sidebar-submenu">
              <Link
                href="/calendars"
                className={
                  activeSection === "calendars"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiCalendar aria-hidden="true" />
                Calendários
              </Link>
              <Link
                href="/producao"
                className={
                  activeSection === "production"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiTool aria-hidden="true" />
                Produção
              </Link>
              <Link
                href="/notificacoes"
                className={
                  activeSection === "notifications"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiBell aria-hidden="true" />
                Notificações
              </Link>
            </div>
          </details>

          <details
            className="sidebar-menu-group"
            open={groupIsActive(activeSection, [
              "clients",
              "team",
              "capacity",
            ])}
          >
            <summary>
              <span>
                <FiUsers className="nav-icon" aria-hidden="true" />
                Gestão
              </span>
              <FiChevronDown
                className="sidebar-menu-chevron"
                aria-hidden="true"
              />
            </summary>
            <div className="sidebar-submenu">
              <Link
                href="/clients"
                className={
                  activeSection === "clients"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiUsers aria-hidden="true" />
                Clientes
              </Link>
              {canSeeUsers ? (
                <>
                  <Link
                    href="/equipe"
                    className={
                      activeSection === "team"
                        ? "sidebar-submenu-link active"
                        : "sidebar-submenu-link"
                    }
                  >
                    <FiUserCheck aria-hidden="true" />
                    Equipe
                  </Link>
                  <Link
                    href="/capacidade"
                    className={
                      activeSection === "capacity"
                        ? "sidebar-submenu-link active"
                        : "sidebar-submenu-link"
                    }
                  >
                    <FiTrendingUp aria-hidden="true" />
                    Capacidade
                  </Link>
                </>
              ) : null}
            </div>
          </details>

          <details
            className="sidebar-menu-group"
            open={groupIsActive(activeSection, [
              "templates",
              "dates",
              "formats",
            ])}
          >
            <summary>
              <span>
                <FiClipboard className="nav-icon" aria-hidden="true" />
                Conteúdo
              </span>
              <FiChevronDown
                className="sidebar-menu-chevron"
                aria-hidden="true"
              />
            </summary>
            <div className="sidebar-submenu">
              {canSeeFormats ? (
                <Link
                  href="/modelos"
                  className={
                    activeSection === "templates"
                      ? "sidebar-submenu-link active"
                      : "sidebar-submenu-link"
                  }
                >
                  <FiClipboard aria-hidden="true" />
                  Modelos de pauta
                </Link>
              ) : null}
              <Link
                href="/datas-comemorativas"
                className={
                  activeSection === "dates"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiStar aria-hidden="true" />
                Datas comemorativas
              </Link>
              {canSeeFormats ? (
                <Link
                  href="/formats"
                  className={
                    activeSection === "formats"
                      ? "sidebar-submenu-link active"
                      : "sidebar-submenu-link"
                  }
                >
                  <FiSliders aria-hidden="true" />
                  Formatos
                </Link>
              ) : null}
            </div>
          </details>

          <details
            className="sidebar-menu-group"
            open={groupIsActive(activeSection, ["reports"])}
          >
            <summary>
              <span>
                <FiBarChart2 className="nav-icon" aria-hidden="true" />
                Resultados
              </span>
              <FiChevronDown
                className="sidebar-menu-chevron"
                aria-hidden="true"
              />
            </summary>
            <div className="sidebar-submenu">
              <Link
                href="/relatorios"
                className={
                  activeSection === "reports"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiPieChart aria-hidden="true" />
                Relatórios
              </Link>
            </div>
          </details>

          {canSeeUsers || canSeeConfig ? (
            <details
              className="sidebar-menu-group"
              open={groupIsActive(activeSection, ["audit", "config"])}
            >
              <summary>
                <span>
                  <FiSettings className="nav-icon" aria-hidden="true" />
                  Sistema
                </span>
                <FiChevronDown
                  className="sidebar-menu-chevron"
                  aria-hidden="true"
                />
              </summary>
              <div className="sidebar-submenu">
                {canSeeUsers ? (
                  <Link
                    href="/auditoria"
                    className={
                      activeSection === "audit"
                        ? "sidebar-submenu-link active"
                        : "sidebar-submenu-link"
                    }
                  >
                    <FiShield aria-hidden="true" />
                    Auditoria
                  </Link>
                ) : null}
                {canSeeConfig ? (
                  <Link
                    href="/config"
                    className={
                      activeSection === "config"
                        ? "sidebar-submenu-link active"
                        : "sidebar-submenu-link"
                    }
                  >
                    <FiSettings aria-hidden="true" />
                    Configurações
                  </Link>
                ) : null}
              </div>
            </details>
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

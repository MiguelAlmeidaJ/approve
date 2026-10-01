import Link from "next/link";
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClipboard,
  FiFolder,
  FiHome,
  FiHelpCircle,
  FiImage,
  FiLogOut,
  FiPieChart,
  FiAward,
  FiSettings,
  FiShield,
  FiSliders,
  FiStar,
  FiTrendingUp,
  FiTool,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { logoutDesigner, markNotificationRead } from "../app/actions";
import { getNotifications, type Designer } from "../lib/api";
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
  | "standalone"
  | "templates"
  | "notifications"
  | "reports"
  | "productivity"
  | "capacity"
  | "audit"
  | "formats"
  | "help"
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

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export async function AppShell({
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
  const notifications = await getNotifications();
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt
  ).length;
  const latestNotifications = notifications.slice(0, 5);

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
              "standalone",
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
                Central de demandas
              </Link>
              <Link
                href="/artes-avulsas"
                className={
                  activeSection === "standalone"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiImage aria-hidden="true" />
                Artes avulsas
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
            open={groupIsActive(activeSection, ["reports", "productivity"])}
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
              <Link
                href="/produtividade"
                className={
                  activeSection === "productivity"
                    ? "sidebar-submenu-link active"
                    : "sidebar-submenu-link"
                }
              >
                <FiAward aria-hidden="true" />
                Produtividade
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

      <div className="app-content">
        <header className="app-topbar">
          <nav className="app-topbar-actions" aria-label="Atalhos">
            <Link
              href="/ajuda"
              className={
                activeSection === "help"
                  ? "app-topbar-action active"
                  : "app-topbar-action"
              }
              aria-label="Ajuda"
              title="Ajuda"
            >
              <FiHelpCircle aria-hidden="true" />
            </Link>

            <details className="app-notification-menu">
              <summary
                className={
                  activeSection === "notifications"
                    ? "app-topbar-action active"
                    : "app-topbar-action"
                }
                aria-label={
                  unreadNotifications > 0
                    ? `Notificações: ${unreadNotifications} não lida(s)`
                    : "Notificações"
                }
                title="Notificações"
              >
                <FiBell aria-hidden="true" />
                {unreadNotifications > 0 ? (
                  <span className="app-topbar-badge">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </summary>

              <div className="app-notification-dropdown">
                <div className="app-notification-dropdown-head">
                  <div>
                    <strong>Notificações</strong>
                    <span>
                      {unreadNotifications > 0
                        ? `${unreadNotifications} não lida(s)`
                        : "Tudo em dia"}
                    </span>
                  </div>
                  <Link href="/notificacoes">Ver todas</Link>
                </div>

                {latestNotifications.length === 0 ? (
                  <div className="app-notification-empty">
                    <FiBell aria-hidden="true" />
                    <span>Nenhuma notificação por enquanto.</span>
                  </div>
                ) : (
                  <div className="app-notification-list">
                    {latestNotifications.map((notification) => (
                      <article
                        className={
                          notification.readAt
                            ? "app-notification-item read"
                            : "app-notification-item"
                        }
                        key={notification.id}
                      >
                        <span className="app-notification-dot" />
                        <div className="app-notification-copy">
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                          <small>{formatNotificationDate(notification.createdAt)}</small>
                        </div>

                        <div className="app-notification-item-actions">
                          {notification.link ? (
                            <Link href={notification.link}>Abrir</Link>
                          ) : null}
                          {!notification.readAt ? (
                            <form action={markNotificationRead}>
                              <input
                                type="hidden"
                                name="notificationId"
                                value={notification.id}
                              />
                              <input
                                type="hidden"
                                name="returnTo"
                                value="/"
                              />
                              <button
                                type="submit"
                                aria-label="Marcar como lida"
                                title="Marcar como lida"
                              >
                                <FiCheck aria-hidden="true" />
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <Link
                  href="/notificacoes"
                  className="app-notification-dropdown-footer"
                >
                  Abrir central de notificações
                </Link>
              </div>
            </details>
          </nav>
        </header>

        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}

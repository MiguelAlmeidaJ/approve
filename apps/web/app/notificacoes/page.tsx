import Link from "next/link";
import {
  FiAlertCircle,
  FiBell,
  FiCheck,
  FiClock,
  FiMessageSquare,
  FiSend
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { markNotificationRead } from "../actions";
import { requireDesigner } from "../../lib/auth";
import { getNotifications } from "../../lib/api";

function notificationIcon(type: string) {
  if (type === "CHANGE") return FiMessageSquare;
  if (type === "DEADLINE") return FiClock;
  if (type === "PUBLISHING") return FiSend;
  if (type === "ACTION") return FiAlertCircle;
  return FiBell;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function NotificationsPage() {
  const designer = await requireDesigner();
  const notifications = await getNotifications();
  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <AppShell designer={designer} activeSection="notifications">
      <header className="page-header">
        <div>
          <span className="micro-label">CENTRAL DE ATENÇÃO</span>
          <h1>Notificações</h1>
          <p>{unread} item(ns) ainda não lido(s).</p>
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="production-empty">
          <FiBell aria-hidden="true" />
          <strong>Nenhuma notificação.</strong>
          <p>Alterações, aprovações e alertas de publicação aparecerão aqui.</p>
        </div>
      ) : (
        <section className="notification-list">
          {notifications.map((notification) => {
            const Icon = notificationIcon(notification.type);

            return (
              <article
                className={
                  notification.readAt
                    ? "notification-row read"
                    : "notification-row"
                }
                key={notification.id}
              >
                <span className="notification-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div className="notification-copy">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <small>{formatDate(notification.createdAt)}</small>
                </div>

                <div className="notification-actions">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="button button-ghost button-small"
                    >
                      Abrir
                    </Link>
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
                        value="/notificacoes"
                      />
                      <button
                        type="submit"
                        className="button button-ghost button-small"
                      >
                        <FiCheck aria-hidden="true" />
                        Lida
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

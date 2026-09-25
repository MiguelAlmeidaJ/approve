import Link from "next/link";
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiFileText,
  FiUser
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireRole } from "../../lib/auth";
import { getAuditLogs } from "../../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function entityIcon(entityType: string) {
  if (entityType === "Calendar") return FiCalendar;
  if (entityType === "ContentItem") return FiFileText;
  return FiActivity;
}

export default async function AuditPage() {
  const designer = await requireRole("ADMIN", "DEV");
  const logs = await getAuditLogs();

  return (
    <AppShell designer={designer} activeSection="audit">
      <header className="page-header">
        <div>
          <span className="micro-label">RASTREABILIDADE</span>
          <h1>Auditoria</h1>
          <p>
            Histórico das principais ações operacionais e aprovações registradas
            no sistema.
          </p>
        </div>
      </header>

      <section className="audit-summary">
        <article>
          <FiActivity aria-hidden="true" />
          <div>
            <small>Eventos carregados</small>
            <strong>{logs.length}</strong>
          </div>
        </article>
        <article>
          <FiUser aria-hidden="true" />
          <div>
            <small>Atores distintos</small>
            <strong>
              {new Set(logs.map((item) => item.actorName).filter(Boolean)).size}
            </strong>
          </div>
        </article>
        <article>
          <FiClock aria-hidden="true" />
          <div>
            <small>Último evento</small>
            <strong>{logs[0] ? formatDate(logs[0].createdAt) : "—"}</strong>
          </div>
        </article>
      </section>

      {logs.length === 0 ? (
        <div className="production-empty">
          <FiActivity aria-hidden="true" />
          <strong>Nenhum evento registrado ainda.</strong>
          <p>Alterações importantes aparecerão aqui conforme o sistema for usado.</p>
        </div>
      ) : (
        <section className="audit-list">
          {logs.map((log) => {
            const Icon = entityIcon(log.entityType);
            const href =
              log.entityType === "Calendar"
                ? `/calendars/${log.entityId}`
                : null;

            const content = (
              <>
                <span className="audit-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div className="audit-copy">
                  <strong>{log.summary}</strong>
                  <span>
                    {log.actorDesigner?.name || log.actorName || "Sistema"} ·{" "}
                    {log.action.replaceAll("_", " ")}
                  </span>
                </div>
                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
              </>
            );

            return href ? (
              <Link className="audit-row" href={href} key={log.id}>
                {content}
              </Link>
            ) : (
              <article className="audit-row" key={log.id}>
                {content}
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

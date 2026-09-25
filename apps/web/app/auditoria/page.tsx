import { FiClock, FiShield, FiUser } from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireRole } from "../../lib/auth";
import { getAuditLogs } from "../../lib/api";

function actionLabel(action: string) {
  return {
    USER_UPDATED: "Usuário atualizado",
    USER_DEACTIVATED: "Usuário inativado",
    USER_REACTIVATED: "Usuário reativado",
    CLIENT_CREATED: "Cliente criado",
    CLIENT_UPDATED: "Cliente atualizado",
    CALENDAR_CREATED: "Calendário criado",
    CALENDAR_UPDATED: "Calendário atualizado",
    PLANNING_SENT: "Planejamento enviado",
    ANNOTATION_CREATED: "Marcação criada",
    ANNOTATION_RESOLVED: "Marcação resolvida",
    ANNOTATION_REOPENED: "Marcação reaberta",
    PUBLIC_REVIEW_APPROVED: "Cliente aprovou",
    PUBLIC_REVIEW_CHANGES_REQUESTED: "Cliente pediu alteração",
    PUBLIC_ART_ANNOTATION_CREATED: "Cliente marcou a arte"
  }[action] ?? action.replaceAll("_", " ");
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function AuditPage() {
  const manager = await requireRole("ADMIN", "DEV");
  const logs = await getAuditLogs();

  return (
    <AppShell designer={manager} activeSection="audit">
      <header className="page-header">
        <div>
          <span className="micro-label">RASTREABILIDADE</span>
          <h1>Auditoria</h1>
          <p>
            Histórico das principais ações internas e decisões registradas pelos clientes.
          </p>
        </div>
      </header>

      {logs.length === 0 ? (
        <div className="my-day-empty">
          <FiShield />
          <strong>Ainda não há eventos de auditoria.</strong>
          <p>As novas ações passarão a aparecer aqui.</p>
        </div>
      ) : (
        <section className="audit-list">
          {logs.map((log) => (
            <article className="audit-row" key={log.id}>
              <span className="audit-icon"><FiShield /></span>
              <div className="audit-copy">
                <strong>{actionLabel(log.action)}</strong>
                <p>{log.summary}</p>
                <span>
                  <FiUser />
                  {log.actorDesigner?.name || log.actorName || "Sistema"}
                </span>
              </div>
              <time dateTime={log.createdAt}>
                <FiClock />
                {dateLabel(log.createdAt)}
              </time>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiAtSign,
  FiBriefcase,
  FiCalendar,
  FiEdit3,
  FiPhone,
  FiPlus,
  FiUserCheck
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { assignClient } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import {
  canAccessClient,
  getClient,
  getDesigners
} from "../../../lib/api";

export default async function ClientPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const designer = await requireDesigner();
  const client = await getClient(clientId);

  if (!client || !canAccessClient(designer, client)) {
    notFound();
  }

  const designers =
    designer.role === "DESIGNER" ? [] : await getDesigners();

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="client-detail-header">
        <div>
          <span className="micro-label">CLIENTE</span>
          <h1>{client.name}</h1>
          <p>
            Dados da conta, responsável e calendários de aprovação.
          </p>
        </div>
        <div className="client-detail-actions">
          <Link
            href={`/clients/${client.id}/edit`}
            className="button button-ghost"
          >
            <FiEdit3 aria-hidden="true" />
            Editar cliente
          </Link>
          <Link
            href={`/clients/${client.id}/calendars/new`}
            className="button button-primary"
          >
            <FiPlus aria-hidden="true" />
            Novo calendário
          </Link>
        </div>
      </header>

      <section className="client-profile-grid">
        <article className="client-profile-main">
          <div className="client-profile-avatar">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="client-niche-chip">
              <FiBriefcase aria-hidden="true" />
              {client.niche || "Nicho não informado"}
            </span>
            <h2>{client.name}</h2>
            <p>/{client.slug}</p>
          </div>
        </article>

        <article className="client-profile-stat">
          <FiAtSign aria-hidden="true" />
          <span>
            Login do cliente
            <strong>
              {client.credential?.email || "Acesso não configurado"}
            </strong>
          </span>
        </article>

        <article className="client-profile-stat">
          <FiPhone aria-hidden="true" />
          <span>
            Telefone
            <strong>{client.phone || "Não informado"}</strong>
          </span>
        </article>

        <article className="client-profile-stat">
          <FiCalendar aria-hidden="true" />
          <span>
            Calendários
            <strong>{client.calendars.length}</strong>
          </span>
        </article>
      </section>

      <section className="client-responsibility">
        <div>
          <span className="client-form-icon">
            <FiUserCheck aria-hidden="true" />
          </span>
          <span className="client-responsibility-copy">
            <small>Designer responsável</small>
            <strong>
              {client.assignedDesigner?.name ?? "Sem designer atribuído"}
            </strong>
            <em>
              {client.assignedDesigner?.email ??
                "Admin ou dev pode definir um responsável."}
            </em>
          </span>
        </div>

        {designer.role !== "DESIGNER" ? (
          <form action={assignClient} className="assignment-form">
            <input type="hidden" name="clientId" value={client.id} />
            <select
              name="designerId"
              defaultValue={client.assignedDesignerId ?? ""}
            >
              <option value="">Sem responsável</option>
              {designers.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button type="submit" className="button button-dark">
              Atualizar responsável
            </button>
          </form>
        ) : null}
      </section>

      <section className="section">
        <div className="section-title-row">
          <div>
            <span className="micro-label">PLANEJAMENTOS</span>
            <h2>Calendários</h2>
          </div>
          <span>{client.calendars.length} no total</span>
        </div>

        {client.calendars.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">
              <FiCalendar aria-hidden="true" />
            </div>
            <h3>Sem calendário ainda</h3>
            <p>Crie o mês e depois adicione as peças para aprovação.</p>
            <Link
              href={`/clients/${client.id}/calendars/new`}
              className="button button-primary"
            >
              Criar calendário
            </Link>
          </div>
        ) : (
          <div className="calendar-list-simple">
            {client.calendars.map((calendar) => {
              const approved = calendar.contentItems.filter(
                (item) => item.status === "APPROVED"
              ).length;

              return (
                <Link
                  href={`/calendars/${calendar.id}`}
                  className="calendar-row"
                  key={calendar.id}
                >
                  <div className="calendar-month-block">
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", {
                        month: "short",
                        timeZone: "UTC"
                      })
                        .format(new Date(calendar.periodStart))
                        .replace(".", "")
                        .toUpperCase()}
                    </span>
                    <strong>
                      {new Date(calendar.periodStart).getUTCFullYear()}
                    </strong>
                  </div>

                  <div className="calendar-row-main">
                    <h3>{calendar.title}</h3>
                    <p>
                      {calendar.contentItems.length} peça(s) · {approved} aprovada(s)
                    </p>
                  </div>

                  <div className="calendar-progress">
                    <div>
                      <span
                        style={{
                          width:
                            calendar.contentItems.length === 0
                              ? "0%"
                              : `${Math.round(
                                  (approved / calendar.contentItems.length) * 100
                                )}%`
                        }}
                      />
                    </div>
                    <small>
                      {approved}/{calendar.contentItems.length}
                    </small>
                  </div>

                  <span className="arrow-link">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

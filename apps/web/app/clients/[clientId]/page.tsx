import Link from "next/link";
import { notFound } from "next/navigation";
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
      <header className="page-header">
        <div>
          <span className="micro-label">CLIENTE</span>
          <h1>{client.name}</h1>
          <p>
            Calendários, peças e links de aprovação deste cliente.
          </p>
        </div>
        <Link
          href={`/clients/${client.id}/calendars/new`}
          className="button button-primary"
        >
          + Novo calendário
        </Link>
      </header>

      <section className="client-responsibility">
        <div>
          <span className="micro-label">RESPONSÁVEL</span>
          <strong>
            {client.assignedDesigner?.name ?? "Sem designer atribuído"}
          </strong>
          <small>
            {client.assignedDesigner?.email ??
              "Admin ou dev pode definir um responsável."}
          </small>
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
          <h2>Calendários</h2>
          <span>{client.calendars.length} no total</span>
        </div>

        {client.calendars.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">□</div>
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

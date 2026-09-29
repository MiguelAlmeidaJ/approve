import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiAtSign,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiEdit3,
  FiPhone,
  FiPlus,
  FiPower,
  FiUserCheck
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { assignClient, setClientActive } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import {
  canAccessClient,
  getClient,
  getClientContractUsage,
  getDesigners
} from "../../../lib/api";

const weekdayLabels: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb"
};

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

  const [designers, contractUsage] = await Promise.all([
    designer.role === "DESIGNER" ? Promise.resolve([]) : getDesigners(),
    getClientContractUsage(clientId)
  ]);
  const activeCalendars = client.calendars.filter(
    (calendar) => !calendar.archivedAt
  );

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="client-detail-header">
        <div>
          <span className="micro-label">CLIENTE</span>
          <div className="client-title-with-status">
            <h1>{client.name}</h1>
            <span
              className={
                client.active
                  ? "account-status-chip active"
                  : "account-status-chip inactive"
              }
            >
              {client.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p>
            Dados da conta, responsável e calendários de aprovação.
          </p>
        </div>
        <div className="client-detail-actions">
          {designer.role !== "DESIGNER" ? (
            <form action={setClientActive}>
              <input type="hidden" name="clientId" value={client.id} />
              <input
                type="hidden"
                name="active"
                value={client.active ? "false" : "true"}
              />
              <button
                type="submit"
                className={
                  client.active
                    ? "button button-danger-outline"
                    : "button button-dark"
                }
              >
                <FiPower aria-hidden="true" />
                {client.active ? "Inativar cliente" : "Reativar cliente"}
              </button>
            </form>
          ) : null}
          <Link
            href={`/clients/${client.id}/edit`}
            className="button button-ghost"
          >
            <FiEdit3 aria-hidden="true" />
            Editar cliente
          </Link>
          {client.active ? (
            <Link
              href={`/clients/${client.id}/calendars/new`}
              className="button button-primary"
            >
              <FiPlus aria-hidden="true" />
              Novo calendário
            </Link>
          ) : null}
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
            <strong>{activeCalendars.length}</strong>
          </span>
        </article>
      </section>

      {contractUsage ? (
        <section className="client-contract-usage">
          <div className="section-title-row">
            <div>
              <span className="micro-label">CONSUMO DO CONTRATO</span>
              <h2>Franquia do mês</h2>
            </div>
            <FiBarChart2 aria-hidden="true" />
          </div>
          <div className="contract-usage-grid">
            {[
              ["Posts", contractUsage.usage.post, contractUsage.limits.post],
              ["Carrosséis", contractUsage.usage.carousel, contractUsage.limits.carousel],
              ["Reels", contractUsage.usage.reel, contractUsage.limits.reel],
              ["Stories", contractUsage.usage.story, contractUsage.limits.story],
              ["Artes avulsas", contractUsage.usage.standalone, contractUsage.limits.standalone],
              ["Pontos", contractUsage.usage.points, contractUsage.limits.points]
            ].map(([label, used, limit]) => {
              const usedValue = Number(used);
              const limitValue = limit === null ? null : Number(limit);
              const percentage =
                limitValue && limitValue > 0
                  ? Math.round((usedValue / limitValue) * 100)
                  : 0;
              const exceeded =
                limitValue !== null && limitValue >= 0 && usedValue > limitValue;

              return (
                <article
                  className={exceeded ? "contract-usage-card exceeded" : "contract-usage-card"}
                  key={String(label)}
                >
                  <div>
                    <small>{label}</small>
                    <strong>
                      {usedValue}
                      <span> / {limitValue === null ? "∞" : limitValue}</span>
                    </strong>
                  </div>
                  {limitValue !== null && limitValue > 0 ? (
                    <div className="contract-usage-track">
                      <i style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                  ) : null}
                  <em>
                    {exceeded
                      ? "Acima do contratado"
                      : limitValue === null
                        ? "Sem limite definido"
                        : `${percentage}% utilizado`}
                  </em>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

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
          <span>
            {activeCalendars.length} ativo(s) ·{" "}
            {client.calendars.length - activeCalendars.length} arquivado(s)
          </span>
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
                  className={
                    calendar.archivedAt
                      ? "calendar-row calendar-row-archived"
                      : "calendar-row"
                  }
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
                    <h3>
                      {calendar.title}
                      {calendar.archivedAt ? (
                        <span className="archive-chip">Arquivado</span>
                      ) : null}
                    </h3>
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

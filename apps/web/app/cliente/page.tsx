import Link from "next/link";
import { FiArrowUpRight, FiLogOut } from "react-icons/fi";
import { Brand } from "../../components/brand";
import { requireClientAccount } from "../../lib/client-auth";
import { logoutClient } from "./actions";

export default async function ClientPortalPage() {
  const client = await requireClientAccount();

  return (
    <main className="client-portal-page">
      <header className="client-portal-header">
        <Brand />
        <div className="client-portal-user">
          <div>
            <strong>{client.name}</strong>
            <span>{client.credential?.email}</span>
          </div>
          <form action={logoutClient}>
            <button type="submit" className="icon-button" aria-label="Sair">
              <FiLogOut aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <section className="client-portal-intro">
        <span className="micro-label">SEUS CALENDÁRIOS</span>
        <h1>Olá, {client.name}.</h1>
        <p>
          Abra um calendário para revisar as peças, aprovar conteúdos ou
          solicitar alterações.
        </p>
      </section>

      {client.calendars.length === 0 ? (
        <div className="public-empty">
          Nenhum calendário disponível para esta conta.
        </div>
      ) : (
        <section className="client-portal-calendar-grid">
          {client.calendars.map((calendar) => {
            const approved = calendar.contentItems.filter((item) =>
              [
                "PRE_APPROVED",
                "DESIGN_PENDING",
                "DESIGN_IN_PROGRESS",
                "ART_APPROVED",
                "READY_TO_SCHEDULE",
                "SCHEDULED",
                "PUBLISHED"
              ].includes(item.stage)
            ).length;
            const total = calendar.contentItems.length;
            const progress =
              total === 0 ? 0 : Math.round((approved / total) * 100);
            const stageLabel = {
              PLANNING: "Planejamento",
              PRE_APPROVAL: "Pré-aprovação",
              PRODUCTION: "Em produção",
              FINAL_APPROVAL: "Aprovação das artes",
              SCHEDULING: "Programação",
              COMPLETED: "Concluído",
              ARCHIVED: "Arquivado"
            }[calendar.stage];

            return (
              <Link
                href={`/p/${calendar.shareToken}`}
                className="client-portal-calendar"
                key={calendar.id}
              >
                <div>
                  <span className="micro-label">
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC"
                    }).format(new Date(calendar.periodStart))}
                  </span>
                  <h2>{calendar.title}</h2>
                  <p>
                    {stageLabel} · {total} peça(s)
                  </p>
                </div>

                <div className="client-portal-progress">
                  <div>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <small>{approved}/{total}</small>
                  <FiArrowUpRight aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

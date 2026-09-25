import Link from "next/link";
import {
  FiCalendar,
  FiFileText,
  FiSearch,
  FiUsers
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();

  const clientResults = query
    ? clients.filter((client) =>
        [client.name, client.niche, client.region]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      )
    : [];

  const calendarResults = query
    ? clients.flatMap((client) =>
        client.calendars
          .filter((calendar) => calendar.title.toLowerCase().includes(query))
          .map((calendar) => ({ client, calendar }))
      )
    : [];

  const contentResults = query
    ? clients.flatMap((client) =>
        client.calendars.flatMap((calendar) =>
          calendar.contentItems
            .filter((item) =>
              [
                item.title,
                item.theme,
                item.headline,
                item.subheadline,
                item.caption
              ]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query))
            )
            .map((item) => ({ client, calendar, item }))
        )
      )
    : [];

  const total =
    clientResults.length + calendarResults.length + contentResults.length;

  return (
    <AppShell designer={designer} activeSection="search">
      <header className="page-header search-page-header">
        <div>
          <span className="micro-label">BUSCA GLOBAL</span>
          <h1>Encontrar</h1>
          <p>Clientes, calendários, pautas, headlines e legendas em um só lugar.</p>
        </div>
      </header>

      <form action="/buscar" className="global-search-form">
        <FiSearch />
        <input
          name="q"
          defaultValue={q}
          placeholder="Busque por cliente, pauta, campanha, texto..."
          autoFocus
        />
        <button type="submit" className="button button-primary">Buscar</button>
      </form>

      {!query ? (
        <div className="search-empty-state">
          <FiSearch />
          <strong>Digite algo para pesquisar.</strong>
          <p>A busca respeita os clientes aos quais você tem acesso.</p>
        </div>
      ) : total === 0 ? (
        <div className="search-empty-state">
          <FiSearch />
          <strong>Nenhum resultado para “{q}”.</strong>
          <p>Tente um termo mais curto ou parte do nome da pauta.</p>
        </div>
      ) : (
        <div className="global-search-results">
          <div className="search-results-summary">{total} resultado(s)</div>

          {clientResults.length > 0 ? (
            <section className="search-result-group">
              <header><FiUsers /><strong>Clientes</strong><span>{clientResults.length}</span></header>
              <div>
                {clientResults.map((client) => (
                  <Link href={`/clients/${client.id}`} key={client.id}>
                    <strong>{client.name}</strong>
                    <small>{client.niche || "Cliente"} · {client.region || "Sem região"}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {calendarResults.length > 0 ? (
            <section className="search-result-group">
              <header><FiCalendar /><strong>Calendários</strong><span>{calendarResults.length}</span></header>
              <div>
                {calendarResults.map(({ client, calendar }) => (
                  <Link href={`/calendars/${calendar.id}`} key={calendar.id}>
                    <strong>{calendar.title}</strong>
                    <small>{client.name} · {calendar.stage.replaceAll("_", " ")}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {contentResults.length > 0 ? (
            <section className="search-result-group">
              <header><FiFileText /><strong>Conteúdos</strong><span>{contentResults.length}</span></header>
              <div>
                {contentResults.slice(0, 80).map(({ client, calendar, item }) => (
                  <Link
                    href={`/calendars/${calendar.id}/content/${item.id}`}
                    key={item.id}
                  >
                    <strong>{item.title}</strong>
                    <small>{client.name} · {item.headline || item.theme || item.contentType}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

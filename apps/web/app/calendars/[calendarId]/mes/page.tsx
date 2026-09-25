import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiStar } from "react-icons/fi";
import { AppShell } from "../../../../components/app-shell";
import { requireDesigner } from "../../../../lib/auth";
import {
  canAccessClient,
  getCalendar,
  getCommemorativeDates
} from "../../../../lib/api";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function localDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export default async function CalendarMonthPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireDesigner();
  const [calendar, dates] = await Promise.all([
    getCalendar(calendarId),
    getCommemorativeDates()
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  const start = new Date(calendar.periodStart);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstSundayBased = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const firstMondayBased = (firstSundayBased + 6) % 7;
  const cells = [
    ...Array.from({ length: firstMondayBased }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1)
  ];

  const itemByDay = new Map(
    calendar.contentItems.map((item) => [
      Number(localDateKey(item.scheduledAt).slice(8, 10)),
      item
    ])
  );
  const relevantDates = dates.filter(
    (date) =>
      date.active &&
      date.month === monthIndex + 1 &&
      (date.year === null || date.year === year) &&
      (date.clientId === null || date.clientId === calendar.client.id)
  );
  const commemorativeByDay = new Map<number, typeof relevantDates>();
  for (const date of relevantDates) {
    commemorativeByDay.set(date.day, [
      ...(commemorativeByDay.get(date.day) ?? []),
      date
    ]);
  }

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header">
        <div>
          <Link href={`/calendars/${calendar.id}`} className="back-link">
            <FiArrowLeft />
            {calendar.title}
          </Link>
          <span className="micro-label">VISÃO MENSAL</span>
          <h1>Calendário editorial</h1>
          <p>
            Veja publicações e oportunidades de pauta no contexto real do mês.
          </p>
        </div>
      </header>

      <section className="editorial-month-card">
        <div className="editorial-month-head">
          <div>
            <FiCalendar />
            <span>{calendar.client.name}</span>
          </div>
          <strong>
            {new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
              timeZone: "UTC"
            }).format(start)}
          </strong>
        </div>

        <div className="editorial-weekdays">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>

        <div className="editorial-month-grid">
          {cells.map((day, index) => {
            if (day === null) {
              return <span className="editorial-day empty" key={`e-${index}`} />;
            }

            const item = itemByDay.get(day);
            const commemoratives = commemorativeByDay.get(day) ?? [];

            return (
              <article
                className={[
                  "editorial-day",
                  item ? "has-content" : "",
                  commemoratives.length ? "has-date" : ""
                ].filter(Boolean).join(" ")}
                key={day}
              >
                <div className="editorial-day-number">
                  <strong>{day}</strong>
                  {commemoratives.length ? <FiStar title={commemoratives.map((d) => d.name).join(" · ")} /> : null}
                </div>

                {commemoratives.slice(0, 2).map((date) => (
                  <span className="editorial-date-label" key={date.id}>
                    {date.name}
                  </span>
                ))}

                {item ? (
                  <Link
                    href={`/calendars/${calendar.id}/content/${item.id}`}
                    className={`editorial-content editorial-stage-${item.stage.toLowerCase()}`}
                  >
                    <strong>{item.title}</strong>
                    <small>{item.contentType}</small>
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

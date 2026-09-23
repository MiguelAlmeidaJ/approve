"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiUser,
  FiX
} from "react-icons/fi";
import { createCalendar } from "../app/actions";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
] as const;

const shortWeekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

const postingPatterns = [
  { label: "2x por semana", weekdays: [2, 4] },
  { label: "3x por semana", weekdays: [1, 3, 5] },
  { label: "Dias úteis", weekdays: [1, 2, 3, 4, 5] }
] as const;

export type CalendarClientOption = {
  id: string;
  name: string;
  designerName: string;
};

function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function calendarDays(year: number, monthIndex: number) {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1)
  ];
}

function formatPostingDay(day: number, year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
    timeZone: "UTC"
  })
    .format(new Date(Date.UTC(year, monthIndex, day)))
    .replace(".", "");
}

export function NewCalendarForm({
  clients,
  initialClientId,
  cancelHref,
  initialMonth
}: {
  clients: CalendarClientOption[];
  initialClientId?: string;
  cancelHref: string;
  initialMonth: string;
}) {
  const [clientId, setClientId] = useState(
    initialClientId && clients.some((client) => client.id === initialClientId)
      ? initialClientId
      : clients[0]?.id ?? ""
  );
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [visibleYear, setVisibleYear] = useState(
    Number(initialMonth.slice(0, 4))
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const selectedMonthIndex = Number(selectedMonth.slice(5, 7)) - 1;
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedClient = clients.find((client) => client.id === clientId);
  const days = useMemo(
    () => calendarDays(selectedYear, selectedMonthIndex),
    [selectedMonthIndex, selectedYear]
  );
  const generatedTitle = `${monthNames[selectedMonthIndex]} ${selectedYear}`;
  const postingDates = selectedDays.map(
    (day) => `${selectedMonth}-${String(day).padStart(2, "0")}`
  );

  function chooseMonth(value: string) {
    setSelectedMonth(value);
    setSelectedDays([]);
  }

  function togglePostingDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((first, second) => first - second)
    );
  }

  function applyPattern(weekdays: readonly number[]) {
    const matchingDays = days.filter(
      (day): day is number =>
        day !== null &&
        weekdays.includes(
          new Date(
            Date.UTC(selectedYear, selectedMonthIndex, day)
          ).getUTCDay()
        )
    );
    setSelectedDays(matchingDays);
  }

  return (
    <form action={createCalendar} className="calendar-creator planner-creator">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="month" value={selectedMonth} />
      <input
        type="hidden"
        name="postingDays"
        value={JSON.stringify(postingDates)}
      />

      <div className="calendar-builder planner-builder">
        <div className="builder-field-heading">
          <span className="builder-step">01</span>
          <div>
            <strong>Escolha o cliente</strong>
            <small>O calendário ficará vinculado a esta conta</small>
          </div>
        </div>

        <label className="field planner-client-field">
          <span>Cliente</span>
          <select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            required
          >
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <div className="builder-divider" />

        <div className="builder-topline">
          <div>
            <span className="builder-step">02</span>
            <div>
              <strong>Defina o período</strong>
              <small>Escolha o mês do planejamento</small>
            </div>
          </div>
          <div className="year-switcher">
            <button
              type="button"
              onClick={() => setVisibleYear((year) => year - 1)}
              aria-label="Ano anterior"
            >
              <FiArrowLeft aria-hidden="true" />
            </button>
            <strong>{visibleYear}</strong>
            <button
              type="button"
              onClick={() => setVisibleYear((year) => year + 1)}
              aria-label="Próximo ano"
            >
              <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="month-picker" role="group" aria-label="Selecione o mês">
          {monthNames.map((monthName, monthIndex) => {
            const value = toMonthValue(visibleYear, monthIndex);
            const selected = value === selectedMonth;

            return (
              <button
                type="button"
                className={selected ? "month-option selected" : "month-option"}
                onClick={() => chooseMonth(value)}
                aria-pressed={selected}
                key={monthName}
              >
                <span>{monthName.slice(0, 3)}</span>
                {selected ? <FiCheck aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="builder-divider" />

        <div className="builder-field-heading">
          <span className="builder-step">03</span>
          <div>
            <strong>Planeje as postagens</strong>
            <small>Use um ritmo sugerido ou clique nos dias da prévia</small>
          </div>
        </div>

        <div className="posting-patterns" role="group" aria-label="Sugestões de frequência">
          {postingPatterns.map((pattern) => (
            <button
              type="button"
              onClick={() => applyPattern(pattern.weekdays)}
              key={pattern.label}
            >
              {pattern.label}
            </button>
          ))}
          {selectedDays.length > 0 ? (
            <button
              type="button"
              className="clear-pattern"
              onClick={() => setSelectedDays([])}
            >
              Limpar
            </button>
          ) : null}
        </div>

        <div className="selected-posting-days">
          <div>
            <FiClock aria-hidden="true" />
            <span>
              <strong>{selectedDays.length}</strong>
              {selectedDays.length === 1 ? " postagem" : " postagens"}
            </span>
          </div>
          {selectedDays.length === 0 ? (
            <p>Selecione os dias no calendário ao lado.</p>
          ) : (
            <div className="posting-day-chips">
              {selectedDays.map((day) => (
                <button
                  type="button"
                  onClick={() => togglePostingDay(day)}
                  aria-label={`Remover ${formatPostingDay(day, selectedYear, selectedMonthIndex)}`}
                  key={day}
                >
                  {formatPostingDay(day, selectedYear, selectedMonthIndex)}
                  <FiX aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="builder-divider" />

        <div className="builder-field-heading">
          <span className="builder-step">04</span>
          <div>
            <strong>Dê um nome</strong>
            <small>Opcional — criamos um automaticamente</small>
          </div>
        </div>

        <label className="field calendar-title-field">
          <span>Título do calendário</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`Ex.: Campanha de ${monthNames[selectedMonthIndex]}`}
          />
        </label>

        <div className="calendar-creator-actions">
          <Link href={cancelHref} className="button button-ghost">
            Cancelar
          </Link>
          <button
            type="submit"
            className="button button-primary"
            disabled={!clientId || selectedDays.length === 0}
          >
            Criar calendário
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <aside className="calendar-preview-panel planner-preview-panel">
        <div className="preview-orbit preview-orbit-one" />
        <div className="preview-orbit preview-orbit-two" />
        <div className="calendar-preview-content planner-preview-content">
          <div className="planner-preview-topline">
            <span className="micro-label micro-label-light">AGENDA DE POSTAGENS</span>
            <span>{selectedDays.length} selecionado(s)</span>
          </div>
          <div className="calendar-preview-heading">
            <div className="calendar-preview-icon">
              <FiCalendar aria-hidden="true" />
            </div>
            <div>
              <span>{selectedClient?.name ?? "Selecione o cliente"}</span>
              <h2>{title.trim() || generatedTitle}</h2>
            </div>
          </div>

          <p className="planner-preview-hint">
            Clique nos dias em que haverá publicação.
          </p>

          <div className="mini-calendar interactive-calendar">
            <div className="mini-calendar-labels">
              {shortWeekdays.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="mini-calendar-days">
              {days.map((day, index) =>
                day === null ? (
                  <span key={`empty-${index}`} />
                ) : (
                  <button
                    type="button"
                    className={selectedDays.includes(day) ? "selected" : ""}
                    onClick={() => togglePostingDay(day)}
                    aria-pressed={selectedDays.includes(day)}
                    aria-label={`${day} de ${monthNames[selectedMonthIndex]}`}
                    key={day}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="calendar-preview-meta">
            <div>
              <FiUser aria-hidden="true" />
              <span>
                Responsável
                <strong>{selectedClient?.designerName ?? "Sem responsável"}</strong>
              </span>
            </div>
            <div>
              <FiCheck aria-hidden="true" />
              <span>
                Planejamento
                <strong>
                  {selectedDays.length > 0
                    ? `${selectedDays.length} dias definidos`
                    : "Escolha os dias"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}

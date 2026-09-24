"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiGrid,
  FiRepeat,
  FiUser,
  FiX,
  FiZap
} from "react-icons/fi";
import { createCalendar, updateCalendar } from "../app/actions";

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

const weekdays = [
  { value: 1, label: "Seg", longLabel: "Segunda" },
  { value: 2, label: "Ter", longLabel: "Terça" },
  { value: 3, label: "Qua", longLabel: "Quarta" },
  { value: 4, label: "Qui", longLabel: "Quinta" },
  { value: 5, label: "Sex", longLabel: "Sexta" },
  { value: 6, label: "Sáb", longLabel: "Sábado" },
  { value: 0, label: "Dom", longLabel: "Domingo" }
] as const;

const postingPatterns = [
  {
    label: "2x por semana",
    description: "Ter e Qui",
    weekdays: [2, 4]
  },
  {
    label: "3x por semana",
    description: "Seg, Qua e Sex",
    weekdays: [1, 3, 5]
  },
  {
    label: "Dias úteis",
    description: "Seg a Sex",
    weekdays: [1, 2, 3, 4, 5]
  }
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
  const sundayBased = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const mondayBased = (sundayBased + 6) % 7;
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: mondayBased }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1)
  ];
}

function daysMatchingWeekdays(
  year: number,
  monthIndex: number,
  selectedWeekdays: readonly number[]
) {
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return Array.from({ length: totalDays }, (_, index) => index + 1).filter(
    (day) =>
      selectedWeekdays.includes(
        new Date(Date.UTC(year, monthIndex, day)).getUTCDay()
      )
  );
}

function formatPostingDay(day: number, year: number, monthIndex: number) {
  const value = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
    timeZone: "UTC"
  })
    .format(new Date(Date.UTC(year, monthIndex, day)))
    .replaceAll(".", "");

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function NewCalendarForm({
  clients,
  initialClientId,
  cancelHref,
  initialMonth,
  calendarId,
  initialTitle = "",
  initialPostingDays = []
}: {
  clients: CalendarClientOption[];
  initialClientId?: string;
  cancelHref: string;
  initialMonth: string;
  calendarId?: string;
  initialTitle?: string;
  initialPostingDays?: string[];
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
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialPostingDays
      .filter((value) => value.startsWith(`${initialMonth}-`))
      .map((value) => Number(value.slice(8, 10)))
      .filter((value) => Number.isFinite(value))
      .sort((first, second) => first - second)
  );
  const [title, setTitle] = useState(initialTitle);
  const isEditing = Boolean(calendarId);

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
    const year = Number(value.slice(0, 4));
    const monthIndex = Number(value.slice(5, 7)) - 1;

    setSelectedMonth(value);
    setSelectedDays(
      selectedWeekdays.length > 0
        ? daysMatchingWeekdays(year, monthIndex, selectedWeekdays)
        : []
    );
  }

  function togglePostingDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((first, second) => first - second)
    );
  }

  function applyWeekdays(nextWeekdays: readonly number[]) {
    const normalized = [...nextWeekdays].sort((first, second) => first - second);
    setSelectedWeekdays(normalized);
    setSelectedDays(
      daysMatchingWeekdays(selectedYear, selectedMonthIndex, normalized)
    );
  }

  function toggleWeekday(weekday: number) {
    const next = selectedWeekdays.includes(weekday)
      ? selectedWeekdays.filter((item) => item !== weekday)
      : [...selectedWeekdays, weekday];

    applyWeekdays(next);
  }

  function clearSchedule() {
    setSelectedWeekdays([]);
    setSelectedDays([]);
  }

  return (
    <form
      action={isEditing ? updateCalendar : createCalendar}
      className="calendar-creator planner-creator"
    >
      <input type="hidden" name="clientId" value={clientId} />
      {calendarId ? (
        <input type="hidden" name="calendarId" value={calendarId} />
      ) : null}
      <input type="hidden" name="month" value={selectedMonth} />
      <input
        type="hidden"
        name="postingDays"
        value={JSON.stringify(postingDates)}
      />

      <div className="calendar-builder planner-builder">
        <section className="planner-section">
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
              disabled={isEditing}
            >
              {clients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="builder-divider" />

        <section className="planner-section">
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
        </section>

        <div className="builder-divider" />

        <section className="planner-section schedule-section">
          <div className="builder-field-heading schedule-heading">
            <span className="builder-step">03</span>
            <div>
              <strong>Defina os dias de publicação</strong>
              <small>
                Selecione os dias da semana e o mês será preenchido
                automaticamente
              </small>
            </div>
          </div>

          <div className="weekday-planner">
            <div className="planner-control-label">
              <div>
                <FiRepeat aria-hidden="true" />
                <span>Repetir toda semana</span>
              </div>
              {selectedWeekdays.length > 0 ? (
                <button type="button" onClick={clearSchedule}>
                  Limpar seleção
                </button>
              ) : null}
            </div>

            <div
              className="weekday-selector"
              role="group"
              aria-label="Dias da semana com publicação"
            >
              {weekdays.map((weekday) => {
                const selected = selectedWeekdays.includes(weekday.value);

                return (
                  <button
                    type="button"
                    className={selected ? "weekday-option selected" : "weekday-option"}
                    onClick={() => toggleWeekday(weekday.value)}
                    aria-pressed={selected}
                    title={weekday.longLabel}
                    key={weekday.value}
                  >
                    <span>{weekday.label}</span>
                    <i>
                      {selected ? <FiCheck aria-hidden="true" /> : null}
                    </i>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-presets">
            <div className="planner-control-label compact">
              <div>
                <FiZap aria-hidden="true" />
                <span>Atalhos</span>
              </div>
            </div>

            <div className="posting-patterns">
              {postingPatterns.map((pattern) => {
                const active =
                  selectedWeekdays.length === pattern.weekdays.length &&
                  pattern.weekdays.every((weekday) =>
                    selectedWeekdays.includes(weekday)
                  );

                return (
                  <button
                    type="button"
                    className={active ? "active" : ""}
                    onClick={() => applyWeekdays(pattern.weekdays)}
                    key={pattern.label}
                  >
                    <strong>{pattern.label}</strong>
                    <small>{pattern.description}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="selected-posting-days">
            <div className="schedule-summary">
              <div className="schedule-summary-icon">
                <FiClock aria-hidden="true" />
              </div>
              <div>
                <strong>
                  {selectedDays.length}{" "}
                  {selectedDays.length === 1 ? "postagem" : "postagens"}
                </strong>
                <span>
                  {selectedWeekdays.length > 0
                    ? "Preenchidas automaticamente. Você ainda pode ajustar dias individuais na prévia."
                    : "Escolha um ou mais dias da semana ou clique diretamente no calendário."}
                </span>
              </div>
            </div>

            {selectedDays.length > 0 ? (
              <div className="posting-day-chips">
                {selectedDays.map((day) => (
                  <button
                    type="button"
                    onClick={() => togglePostingDay(day)}
                    aria-label={`Remover ${formatPostingDay(day, selectedYear, selectedMonthIndex)}`}
                    key={day}
                  >
                    <span>
                      {formatPostingDay(day, selectedYear, selectedMonthIndex)}
                    </span>
                    <FiX aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="builder-divider" />

        <section className="planner-section">
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
        </section>

        <div className="calendar-creator-actions">
          <Link href={cancelHref} className="button button-ghost">
            Cancelar
          </Link>
          <button
            type="submit"
            className="button button-primary"
            disabled={!clientId || selectedDays.length === 0}
          >
            {isEditing ? "Salvar alterações" : "Criar calendário"}
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <aside className="calendar-preview-panel planner-preview-panel">
        <div className="preview-orbit preview-orbit-one" />
        <div className="preview-orbit preview-orbit-two" />

        <div className="calendar-preview-content planner-preview-content">
          <div className="planner-preview-topline">
            <span className="preview-eyebrow">
              <FiGrid aria-hidden="true" />
              Prévia do planejamento
            </span>
            <span className="preview-count">
              {selectedDays.length} selecionado(s)
            </span>
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
            Clique em qualquer data para incluir ou remover uma publicação.
          </p>

          <div className="mini-calendar interactive-calendar">
            <div className="mini-calendar-labels">
              {weekdays.map((weekday) => (
                <span key={weekday.value}>{weekday.label}</span>
              ))}
            </div>

            <div className="mini-calendar-days">
              {days.map((day, index) =>
                day === null ? (
                  <span className="calendar-empty-day" key={`empty-${index}`} />
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
                    {selectedDays.includes(day) ? <i /> : null}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="preview-schedule-note">
            <FiRepeat aria-hidden="true" />
            <div>
              <span>Ritmo selecionado</span>
              <strong>
                {selectedWeekdays.length > 0
                  ? weekdays
                      .filter((weekday) =>
                        selectedWeekdays.includes(weekday.value)
                      )
                      .map((weekday) => weekday.label)
                      .join(" · ")
                  : "Personalizado"}
              </strong>
            </div>
          </div>

          <div className="calendar-preview-meta">
            <div>
              <FiUser aria-hidden="true" />
              <span>
                Responsável
                <strong>
                  {selectedClient?.designerName ?? "Sem responsável"}
                </strong>
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

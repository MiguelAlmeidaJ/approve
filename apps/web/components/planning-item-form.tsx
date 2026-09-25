"use client";

import { useMemo, useState } from "react";
import {
  FiCheck,
  FiClock,
  FiEdit3,
  FiImage,
  FiLayers,
  FiMonitor,
  FiPlay,
  FiSmartphone
} from "react-icons/fi";
import {
  createPlanningItem,
  updatePlanningItem
} from "../app/actions";
import type {
  CalendarPostingDay,
  CommemorativeDate,
  ContentItem,
  ContentType
} from "../lib/api";

const contentTypes: Array<{
  value: ContentType;
  label: string;
  description: string;
  icon: typeof FiImage;
}> = [
  {
    value: "POST",
    label: "Post",
    description: "Imagem no feed",
    icon: FiImage
  },
  {
    value: "CAROUSEL",
    label: "Carrossel",
    description: "Sequência de peças",
    icon: FiLayers
  },
  {
    value: "REEL",
    label: "Reels",
    description: "Vídeo vertical",
    icon: FiPlay
  },
  {
    value: "STORY",
    label: "Stories",
    description: "Conteúdo vertical",
    icon: FiSmartphone
  }
];

function dateKey(value: string) {
  return value.slice(0, 10);
}

function saoPauloDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function saoPauloTime(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));

  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  })
    .format(new Date(value))
    .replaceAll(".", "");
}

export function PlanningItemForm({
  calendarId,
  postingDays,
  occupiedDates,
  item,
  commemorativeDates = []
}: {
  calendarId: string;
  postingDays: CalendarPostingDay[];
  occupiedDates: string[];
  item?: ContentItem;
  commemorativeDates?: CommemorativeDate[];
}) {
  const editing = Boolean(item);
  const currentDate = item ? saoPauloDateKey(item.scheduledAt) : "";
  const occupied = useMemo(
    () => new Set(occupiedDates.filter((value) => value !== currentDate)),
    [currentDate, occupiedDates]
  );
  const availableDays = postingDays.filter(
    (day) => !occupied.has(dateKey(day.scheduledDate))
  );
  const [contentType, setContentType] = useState<ContentType>(
    item?.contentType ?? "POST"
  );
  const [publishToFeed, setPublishToFeed] = useState(
    item?.publishToFeed ?? true
  );
  const [publishToStories, setPublishToStories] = useState(
    item?.publishToStories ?? false
  );
  const [postingDate, setPostingDate] = useState(
    currentDate || dateKey(availableDays[0]?.scheduledDate ?? "")
  );
  const selectedCommemorativeDates = useMemo(() => {
    if (!postingDate) {
      return [];
    }

    const [year, month, day] = postingDate.split("-").map(Number);

    return commemorativeDates.filter(
      (date) =>
        date.active &&
        date.month === month &&
        date.day === day &&
        (date.year === null || date.year === year)
    );
  }, [commemorativeDates, postingDate]);

  function selectType(value: ContentType) {
    setContentType(value);

    if (value === "STORY") {
      setPublishToFeed(false);
      setPublishToStories(true);
    }
  }

  function toggleFeed() {
    if (publishToFeed && !publishToStories) {
      return;
    }
    setPublishToFeed((value) => !value);
  }

  function toggleStories() {
    if (publishToStories && !publishToFeed) {
      return;
    }
    setPublishToStories((value) => !value);
  }

  return (
    <form
      action={editing ? updatePlanningItem : createPlanningItem}
      className="planning-editor"
    >
      <input type="hidden" name="calendarId" value={calendarId} />
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      <input type="hidden" name="contentType" value={contentType} />

      <section className="planning-editor-section">
        <div className="planning-editor-number">01</div>
        <div className="planning-editor-body">
          <div className="planning-editor-heading">
            <strong>Estrutura da publicação</strong>
            <span>Defina formato, destino e data antes do briefing.</span>
          </div>

          <div className="content-type-grid planning-type-grid">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const selected = contentType === type.value;

              return (
                <button
                  type="button"
                  className={selected ? "selected" : ""}
                  onClick={() => selectType(type.value)}
                  aria-pressed={selected}
                  key={type.value}
                >
                  <span className="content-type-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{type.label}</strong>
                    <small>{type.description}</small>
                  </span>
                  {selected ? <FiCheck className="content-type-check" /> : null}
                </button>
              );
            })}
          </div>

          <div className="placement-grid">
            <label className={publishToFeed ? "selected" : ""}>
              <input
                type="checkbox"
                name="publishToFeed"
                checked={publishToFeed}
                onChange={toggleFeed}
              />
              <FiMonitor aria-hidden="true" />
              <span>
                <strong>Feed</strong>
                <small>Grade principal do perfil</small>
              </span>
              <i>{publishToFeed ? <FiCheck /> : null}</i>
            </label>

            <label className={publishToStories ? "selected" : ""}>
              <input
                type="checkbox"
                name="publishToStories"
                checked={publishToStories}
                onChange={toggleStories}
              />
              <FiSmartphone aria-hidden="true" />
              <span>
                <strong>Stories</strong>
                <small>Faixa de stories do perfil</small>
              </span>
              <i>{publishToStories ? <FiCheck /> : null}</i>
            </label>
          </div>

          <div className="planning-date-grid">
            <label className="field">
              <span>Dia da publicação</span>
              <select
                name="postingDate"
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
                required
              >
                {postingDays.map((day) => {
                  const value = dateKey(day.scheduledDate);
                  const unavailable = occupied.has(value);

                  return (
                    <option
                      value={value}
                      disabled={unavailable}
                      key={day.id}
                    >
                      {formatDate(day.scheduledDate)}
                      {(() => {
                        const [year, month, dateDay] = value
                          .split("-")
                          .map(Number);
                        const labels = commemorativeDates
                          .filter(
                            (date) =>
                              date.active &&
                              date.month === month &&
                              date.day === dateDay &&
                              (date.year === null || date.year === year)
                          )
                          .map((date) => date.name);

                        return labels.length > 0
                          ? ` · ${labels.join(" / ")}`
                          : "";
                      })()}
                      {unavailable ? " · ocupado" : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="field">
              <span>Horário</span>
              <div className="input-with-icon">
                <FiClock aria-hidden="true" />
                <input
                  type="time"
                  name="postingTime"
                  defaultValue={
                    item ? saoPauloTime(item.scheduledAt) : "12:00"
                  }
                  required
                />
              </div>
            </label>
          </div>

          {selectedCommemorativeDates.length > 0 ? (
            <div className="planning-date-opportunity">
              <strong>Oportunidade de pauta</strong>
              {selectedCommemorativeDates.map((date) => (
                <span key={date.id}>
                  {date.name}
                  {date.description ? ` — ${date.description}` : ""}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="planning-editor-section">
        <div className="planning-editor-number">02</div>
        <div className="planning-editor-body">
          <div className="planning-editor-heading">
            <strong>Briefing aprovado pelo cliente</strong>
            <span>
              Estas informações orientarão o designer depois da aprovação.
            </span>
          </div>

          <div className="planning-fields-grid">
            <label className="field field-span-2">
              <span>Nome interno da peça</span>
              <input
                name="title"
                defaultValue={item?.title ?? ""}
                placeholder="Ex.: Dia da Independência"
                required
              />
            </label>

            <label className="field field-span-2">
              <span>Tema</span>
              <input
                name="theme"
                defaultValue={item?.theme ?? ""}
                placeholder="Ex.: Independência, liberdade e conectividade"
                required
              />
            </label>

            <label className="field">
              <span>Headline</span>
              <input
                name="headline"
                defaultValue={item?.headline ?? ""}
                placeholder="A liberdade de estar conectado"
                required
              />
            </label>

            <label className="field">
              <span>Subheadline</span>
              <input
                name="subheadline"
                defaultValue={item?.subheadline ?? ""}
                placeholder="Complemento opcional da mensagem"
              />
            </label>

            <label className="field field-span-2">
              <span>Legenda</span>
              <textarea
                name="caption"
                rows={7}
                defaultValue={item?.caption ?? ""}
                placeholder="Legenda que será submetida para aprovação..."
                required
              />
            </label>

            <label className="field field-span-2">
              <span>Orientações para o designer</span>
              <textarea
                name="designerNotes"
                rows={4}
                defaultValue={item?.designerNotes ?? ""}
                placeholder="Referências visuais, elementos obrigatórios, observações..."
              />
            </label>
          </div>
        </div>
      </section>

      <footer className="planning-editor-footer">
        <div>
          <FiEdit3 aria-hidden="true" />
          <span>
            {editing
              ? "Ao salvar, uma aprovação anterior desta peça será invalidada se o pré-calendário já tiver sido enviado."
              : "A arte será produzida somente depois da aprovação deste pré-calendário."}
          </span>
        </div>
        <button type="submit" className="button button-primary">
          {editing ? "Salvar briefing" : "Adicionar ao pré-calendário"}
        </button>
      </footer>
    </form>
  );
}

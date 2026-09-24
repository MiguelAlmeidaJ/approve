"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiClock,
  FiGrid,
  FiImage,
  FiLayers,
  FiMonitor,
  FiPlay,
  FiSmartphone
} from "react-icons/fi";
import { createContentItem } from "../app/actions";
import type {
  CalendarPostingDay,
  ContentFormat,
  ContentType
} from "../lib/api";
import {
  NextcloudAssetPicker,
  type SelectedNextcloudAsset
} from "./nextcloud-asset-picker";

const contentTypes: Array<{
  value: ContentType;
  label: string;
  description: string;
  icon: typeof FiImage;
}> = [
  {
    value: "POST",
    label: "Post",
    description: "Imagem única no feed",
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

function formatPostingDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  })
    .format(new Date(value))
    .replaceAll(".", "");
}

export function ContentComposer({
  calendarId,
  clientId,
  postingDays,
  formats,
  showHeader = true
}: {
  calendarId: string;
  clientId: string;
  postingDays: CalendarPostingDay[];
  formats: ContentFormat[];
  showHeader?: boolean;
}) {
  const [contentType, setContentType] = useState<ContentType>("POST");
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [publishToStories, setPublishToStories] = useState(false);
  const [postingDate, setPostingDate] = useState(
    postingDays[0] ? dateKey(postingDays[0].scheduledDate) : ""
  );
  const [formatId, setFormatId] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<
    SelectedNextcloudAsset[]
  >([]);

  const availableFormats = useMemo(
    () =>
      formats.filter(
        (format) =>
          format.active &&
          format.contentType === contentType &&
          (!publishToFeed || format.supportsFeed) &&
          (!publishToStories || format.supportsStories)
      ),
    [contentType, formats, publishToFeed, publishToStories]
  );

  useEffect(() => {
    if (!availableFormats.some((format) => format.id === formatId)) {
      setFormatId(availableFormats[0]?.id ?? "");
    }
  }, [availableFormats, formatId]);

  function selectType(nextType: ContentType) {
    setContentType(nextType);

    if (nextType !== "CAROUSEL" && selectedAssets.length > 1) {
      setSelectedAssets(selectedAssets.slice(0, 1));
    }

    if (nextType === "STORY") {
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
    <section
      className={
        showHeader
          ? "content-composer"
          : "content-composer content-composer-standalone"
      }
      id="novo-conteudo"
    >
      {showHeader ? (
        <div className="content-composer-heading">
          <div>
            <span className="micro-label">NOVA PEÇA</span>
            <h2>Adicionar conteúdo</h2>
            <p>
              Use um dos dias já planejados no calendário e escolha como a peça
              será publicada.
            </p>
          </div>
          <div className="content-composer-badge">
            <FiGrid aria-hidden="true" />
            {postingDays.length} dia(s) planejado(s)
          </div>
        </div>
      ) : null}

      <form action={createContentItem} className="content-composer-form">
        <input type="hidden" name="calendarId" value={calendarId} />
        <input type="hidden" name="contentType" value={contentType} />
        {selectedAssets.map((asset) => (
          <input
            type="hidden"
            name="assetPath"
            value={asset.path}
            key={asset.path}
          />
        ))}

        <section className="composer-block">
          <div className="composer-block-title">
            <span>01</span>
            <div>
              <strong>Tipo de conteúdo</strong>
              <small>Selecione a estrutura da peça.</small>
            </div>
          </div>

          <div className="content-type-grid">
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
        </section>

        <section className="composer-block">
          <div className="composer-block-title">
            <span>02</span>
            <div>
              <strong>Onde vai aparecer?</strong>
              <small>Uma mesma peça pode ir para Feed e Stories.</small>
            </div>
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
        </section>

        <section className="composer-block">
          <div className="composer-block-title">
            <span>03</span>
            <div>
              <strong>Quando publicar?</strong>
              <small>Somente os dias definidos no planejamento aparecem aqui.</small>
            </div>
          </div>

          {postingDays.length === 0 ? (
            <div className="composer-warning">
              Este calendário não possui dias de publicação configurados.
            </div>
          ) : (
            <div className="posting-date-grid">
              {postingDays.map((day) => {
                const value = dateKey(day.scheduledDate);
                const selected = postingDate === value;

                return (
                  <label className={selected ? "selected" : ""} key={day.id}>
                    <input
                      type="radio"
                      name="postingDate"
                      value={value}
                      checked={selected}
                      onChange={() => setPostingDate(value)}
                    />
                    <strong>
                      {new Date(day.scheduledDate).getUTCDate().toString().padStart(2, "0")}
                    </strong>
                    <span>{formatPostingDate(day.scheduledDate)}</span>
                    {selected ? <FiCheck aria-hidden="true" /> : null}
                  </label>
                );
              })}
            </div>
          )}

          <label className="field composer-time-field">
            <span>Horário</span>
            <div className="input-with-icon">
              <FiClock aria-hidden="true" />
              <input
                type="time"
                name="postingTime"
                defaultValue="12:00"
                required
              />
            </div>
          </label>
        </section>

        <section className="composer-block">
          <div className="composer-block-title">
            <span>04</span>
            <div>
              <strong>Formato e conteúdo</strong>
              <small>O formato é filtrado automaticamente pelo tipo e destino.</small>
            </div>
          </div>

          <div className="content-form-grid">
            <label className="field field-span-2">
              <span>Título da peça</span>
              <input
                name="title"
                placeholder="Ex.: Posicionamento da marca"
                required
              />
            </label>

            <label className="field">
              <span>Formato</span>
              <select
                name="formatId"
                value={formatId}
                onChange={(event) => setFormatId(event.target.value)}
                required
              >
                {availableFormats.length === 0 ? (
                  <option value="">Nenhum formato compatível</option>
                ) : (
                  availableFormats.map((format) => (
                    <option value={format.id} key={format.id}>
                      {format.name} · {format.width}x{format.height}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="field field-span-2">
              <span>Arte</span>
              <NextcloudAssetPicker
                clientId={clientId}
                multiple={contentType === "CAROUSEL"}
                selected={selectedAssets}
                onChange={setSelectedAssets}
              />
            </div>

            <label className="field field-span-2">
              <span>Legenda</span>
              <textarea
                name="caption"
                rows={6}
                placeholder="Texto que o cliente verá junto da peça..."
                required
              />
            </label>
          </div>
        </section>

        <div className="content-composer-footer">
          <div>
            <FiCheck aria-hidden="true" />
            <span>
              {availableFormats.length > 0
                ? "Tudo pronto para adicionar ao calendário."
                : "Cadastre um formato compatível antes de continuar."}
            </span>
          </div>
          <button
            type="submit"
            className="button button-primary"
            disabled={
              !postingDate || !formatId || selectedAssets.length === 0
            }
          >
            Adicionar ao calendário
          </button>
        </div>
      </form>
    </section>
  );
}

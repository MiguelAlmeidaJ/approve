"use client";

import { useMemo, useState } from "react";
import {
  FiCheck,
  FiImage,
  FiLayers,
  FiMonitor,
  FiSmartphone
} from "react-icons/fi";
import { attachArtwork } from "../app/actions";
import type {
  ContentFormat,
  ContentItem
} from "../lib/api";
import {
  NextcloudAssetPicker,
  type SelectedNextcloudAsset
} from "./nextcloud-asset-picker";

export function ArtworkUploader({
  calendarId,
  clientId,
  item,
  formats
}: {
  calendarId: string;
  clientId: string;
  item: ContentItem;
  formats: ContentFormat[];
}) {
  const availableFormats = useMemo(
    () =>
      formats.filter(
        (format) =>
          format.active &&
          format.contentType === item.contentType &&
          (!item.publishToFeed || format.supportsFeed) &&
          (!item.publishToStories || format.supportsStories)
      ),
    [formats, item.contentType, item.publishToFeed, item.publishToStories]
  );
  const [formatId, setFormatId] = useState(
    item.formatId &&
      availableFormats.some((format) => format.id === item.formatId)
      ? item.formatId
      : availableFormats[0]?.id ?? ""
  );
  const [assets, setAssets] = useState<SelectedNextcloudAsset[]>([]);

  return (
    <form action={attachArtwork} className="artwork-uploader">
      <input type="hidden" name="calendarId" value={calendarId} />
      <input type="hidden" name="itemId" value={item.id} />
      {assets.map((asset) => (
        <input
          type="hidden"
          name="assetPath"
          value={asset.path}
          key={asset.path}
        />
      ))}

      <section className="artwork-brief-card">
        <div className="artwork-brief-heading">
          <div>
            <span className="micro-label">BRIEFING APROVADO</span>
            <h2>{item.title}</h2>
          </div>
          <span className="workflow-type-pill">{item.contentType}</span>
        </div>

        <div className="artwork-brief-grid">
          <article>
            <small>Tema</small>
            <strong>{item.theme || "—"}</strong>
          </article>
          <article>
            <small>Headline</small>
            <strong>{item.headline || "—"}</strong>
          </article>
          <article>
            <small>Subheadline</small>
            <strong>{item.subheadline || "—"}</strong>
          </article>
          <article>
            <small>Destinos</small>
            <strong>
              {item.publishToFeed ? "Feed" : ""}
              {item.publishToFeed && item.publishToStories ? " + " : ""}
              {item.publishToStories ? "Stories" : ""}
            </strong>
          </article>
        </div>

        <div className="artwork-copy-block">
          <small>Legenda</small>
          <p>{item.caption}</p>
        </div>

        {item.designerNotes ? (
          <div className="artwork-copy-block">
            <small>Orientações do planejamento</small>
            <p>{item.designerNotes}</p>
          </div>
        ) : null}
      </section>

      <section className="artwork-upload-card">
        <div className="artwork-upload-heading">
          <span className="artwork-upload-icon">
            {item.contentType === "CAROUSEL" ? (
              <FiLayers aria-hidden="true" />
            ) : (
              <FiImage aria-hidden="true" />
            )}
          </span>
          <div>
            <span className="micro-label">PRODUÇÃO</span>
            <h2>Anexar arte</h2>
            <p>
              Selecione o formato e escolha a mídia direto da pasta do cliente
              no Nextcloud.
            </p>
          </div>
        </div>

        <div className="artwork-placement-summary">
          {item.publishToFeed ? (
            <span>
              <FiMonitor aria-hidden="true" />
              Feed
            </span>
          ) : null}
          {item.publishToStories ? (
            <span>
              <FiSmartphone aria-hidden="true" />
              Stories
            </span>
          ) : null}
        </div>

        <label className="field">
          <span>Formato final</span>
          <select
            name="formatId"
            value={formatId}
            onChange={(event) => setFormatId(event.target.value)}
            required
          >
            {availableFormats.length === 0 ? (
              <option value="">Nenhum formato compatível cadastrado</option>
            ) : (
              availableFormats.map((format) => (
                <option value={format.id} key={format.id}>
                  {format.name} · {format.width}x{format.height}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="field">
          <span>
            {item.contentType === "CAROUSEL"
              ? "Arquivos do carrossel"
              : "Arquivo da arte"}
          </span>
          <NextcloudAssetPicker
            clientId={clientId}
            multiple={item.contentType === "CAROUSEL"}
            selected={assets}
            onChange={setAssets}
          />
        </div>

        {item.assets.length > 0 ? (
          <div className="artwork-replace-note">
            Esta peça já possui {item.assets.length} arquivo(s). Ao salvar, a
            seleção atual será substituída pela nova versão.
          </div>
        ) : null}

        <button
          type="submit"
          className="button button-primary button-wide"
          disabled={!formatId || assets.length === 0}
        >
          <FiCheck aria-hidden="true" />
          Salvar arte no calendário
        </button>
      </section>
    </form>
  );
}

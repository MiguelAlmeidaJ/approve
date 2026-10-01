"use client";

import { useState } from "react";
import {
  FiEdit3,
  FiImage,
  FiMonitor,
  FiPlus,
  FiSmartphone
} from "react-icons/fi";
import { createContentFormat, updateContentFormat } from "../app/actions";
import type { ContentFormat } from "../lib/api";
import { AppModal } from "./app-modal";

const typeLabel = {
  POST: "Post",
  CAROUSEL: "Carrossel",
  REEL: "Reels",
  STORY: "Stories"
} as const;

function FormatForm({
  mode,
  format,
  onDone
}: {
  mode: "create" | "edit";
  format?: ContentFormat;
  onDone: () => void;
}) {
  async function submit(formData: FormData) {
    if (mode === "edit" && format) {
      formData.set("formatId", format.id);
      await updateContentFormat(formData);
    } else {
      await createContentFormat(formData);
    }
    onDone();
  }

  return (
    <form action={submit} className="stack-form">
      <label className="field">
        <span>Nome</span>
        <input
          name="name"
          defaultValue={format?.name ?? ""}
          placeholder="Ex.: Post vertical"
          required
        />
      </label>

      <label className="field">
        <span>Tipo</span>
        <select
          name="contentType"
          defaultValue={format?.contentType ?? "POST"}
        >
          <option value="POST">Post</option>
          <option value="CAROUSEL">Carrossel</option>
          <option value="REEL">Reels</option>
          <option value="STORY">Stories</option>
        </select>
      </label>

      <div className="form-inline">
        <label className="field">
          <span>Largura</span>
          <input
            type="number"
            name="width"
            min={1}
            defaultValue={format?.width ?? 1080}
            required
          />
        </label>
        <label className="field">
          <span>Altura</span>
          <input
            type="number"
            name="height"
            min={1}
            defaultValue={format?.height ?? 1350}
            required
          />
        </label>
      </div>

      <div className="format-placement-options">
        <label>
          <input
            type="checkbox"
            name="supportsFeed"
            defaultChecked={format?.supportsFeed ?? true}
          />
          <FiMonitor aria-hidden="true" />
          Feed
        </label>
        <label>
          <input
            type="checkbox"
            name="supportsStories"
            defaultChecked={format?.supportsStories ?? false}
          />
          <FiSmartphone aria-hidden="true" />
          Stories
        </label>
        {mode === "edit" ? (
          <label>
            <input
              type="checkbox"
              name="active"
              defaultChecked={format?.active ?? true}
            />
            Ativo
          </label>
        ) : null}
      </div>

      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" className="button button-primary">
          {mode === "edit" ? "Salvar formato" : (
            <>
              <FiPlus aria-hidden="true" />
              Criar formato
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function FormatManager({ formats }: { formats: ContentFormat[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ContentFormat | null>(null);

  return (
    <>
      <div className="format-page-toolbar">
        <div className="section-title-row">
          <h2>Formatos cadastrados</h2>
          <span>{formats.length} no total</span>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => setCreating(true)}
        >
          <FiPlus aria-hidden="true" />
          Novo formato
        </button>
      </div>

      <div className="format-card-grid format-card-grid-full">
        {formats.map((format) => (
          <article
            className={format.active ? "format-card" : "format-card inactive"}
            key={format.id}
          >
            <div className="format-card-preview">
              <FiImage aria-hidden="true" />
              <span>
                {format.width} × {format.height}
              </span>
            </div>

            <div className="format-card-copy">
              <span className="role-chip">{typeLabel[format.contentType]}</span>
              <h3>{format.name}</h3>
              <div className="format-destinations">
                {format.supportsFeed ? (
                  <span><FiMonitor /> Feed</span>
                ) : null}
                {format.supportsStories ? (
                  <span><FiSmartphone /> Stories</span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label={`Editar ${format.name}`}
              onClick={() => setEditing(format)}
            >
              <FiEdit3 aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      <AppModal
        open={creating}
        onClose={() => setCreating(false)}
        eyebrow="NOVO FORMATO"
        title="Cadastrar formato"
      >
        <p className="app-modal-intro">
          Defina o tipo, dimensões e onde este formato pode ser utilizado.
        </p>
        <FormatForm mode="create" onDone={() => setCreating(false)} />
      </AppModal>

      <AppModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        eyebrow="EDITAR FORMATO"
        title={editing?.name ?? "Editar formato"}
      >
        <p className="app-modal-intro">
          Atualize dimensões, tipo e compatibilidades deste formato.
        </p>
        {editing ? (
          <FormatForm
            mode="edit"
            format={editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </AppModal>
    </>
  );
}

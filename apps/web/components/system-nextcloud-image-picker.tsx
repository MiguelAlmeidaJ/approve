"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiFile,
  FiFolder,
  FiImage,
  FiLoader,
  FiX
} from "react-icons/fi";
import type { NextcloudFileItem } from "../lib/api";

export type SystemImageSelection = {
  name: string;
  path: string;
} | null;

function parentPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

function previewUrl(path: string) {
  const params = new URLSearchParams({ path });
  return `/api/nextcloud/system-file?${params.toString()}`;
}

export function SystemNextcloudImagePicker({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: SystemImageSelection;
  onChange: (value: SystemImageSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("/");
  const [items, setItems] = useState<NextcloudFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ path });

    setLoading(true);
    setError("");

    fetch(`/api/nextcloud/system-files?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            payload?.message ??
            payload?.error ??
            "Não foi possível carregar os arquivos do Nextcloud.";
          throw new Error(
            Array.isArray(message) ? message.join(" ") : String(message)
          );
        }
        return payload as NextcloudFileItem[];
      })
      .then((payload) =>
        setItems(
          payload.filter(
            (item) =>
              item.isDirectory || Boolean(item.mimeType?.startsWith("image/"))
          )
        )
      )
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar o Nextcloud."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, path]);

  const directories = useMemo(
    () => items.filter((item) => item.isDirectory),
    [items]
  );
  const images = useMemo(
    () => items.filter((item) => !item.isDirectory),
    [items]
  );

  function choose(item: NextcloudFileItem) {
    if (item.isDirectory) {
      setPath(item.path);
      return;
    }

    onChange({ name: item.name, path: item.path });
    setOpen(false);
  }

  return (
    <div className="system-image-picker">
      <div className="system-image-picker-copy">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <div className="system-image-picker-current">
        <div className="system-image-picker-preview">
          {value ? (
            <img src={previewUrl(value.path)} alt="" />
          ) : (
            <FiImage aria-hidden="true" />
          )}
        </div>
        <div>
          <small>{value ? "Arquivo selecionado" : "Padrão do sistema"}</small>
          <strong>{value?.name ?? "Nenhum arquivo personalizado"}</strong>
          {value ? <code>{value.path}</code> : null}
        </div>
      </div>

      <div className="system-image-picker-actions">
        <button
          type="button"
          className="button button-ghost"
          onClick={() => setOpen(true)}
        >
          <FiFolder aria-hidden="true" />
          Selecionar no Nextcloud
        </button>
        {value ? (
          <button
            type="button"
            className="button button-ghost"
            onClick={() => onChange(null)}
          >
            Usar padrão
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="nextcloud-browser-layer">
          <button
            type="button"
            className="nextcloud-browser-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Fechar Nextcloud"
          />
          <section className="nextcloud-browser system-nextcloud-browser">
            <header>
              <div>
                <span className="nextcloud-mark">NC</span>
                <span>
                  <strong>Selecionar imagem</strong>
                  <small>Identidade visual · {path === "/" ? "raiz" : path}</small>
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="nextcloud-browser-nav">
              <button
                type="button"
                onClick={() => setPath(parentPath(path))}
                disabled={path === "/"}
              >
                <FiArrowLeft aria-hidden="true" />
                Voltar
              </button>
              <code>{path}</code>
              <span>{images.length} imagem(ns)</span>
            </div>

            {error ? (
              <div className="nextcloud-browser-error">{error}</div>
            ) : loading ? (
              <div className="nextcloud-browser-loading">
                <FiLoader aria-hidden="true" />
                Carregando Nextcloud...
              </div>
            ) : (
              <div className="system-nextcloud-grid">
                {directories.map((item) => (
                  <button
                    type="button"
                    className="system-nextcloud-folder"
                    onClick={() => choose(item)}
                    key={item.path}
                  >
                    <FiFolder aria-hidden="true" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>Pasta</small>
                    </span>
                  </button>
                ))}

                {images.map((item) => {
                  const selected = value?.path === item.path;
                  return (
                    <button
                      type="button"
                      className={
                        selected
                          ? "system-nextcloud-image selected"
                          : "system-nextcloud-image"
                      }
                      onClick={() => choose(item)}
                      key={item.path}
                    >
                      <span>
                        <img src={previewUrl(item.path)} alt="" />
                        {selected ? (
                          <em>
                            <FiCheck aria-hidden="true" />
                          </em>
                        ) : null}
                      </span>
                      <strong>{item.name}</strong>
                    </button>
                  );
                })}

                {directories.length === 0 && images.length === 0 ? (
                  <div className="system-nextcloud-empty">
                    <FiFile aria-hidden="true" />
                    <span>Nenhuma imagem encontrada nesta pasta.</span>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

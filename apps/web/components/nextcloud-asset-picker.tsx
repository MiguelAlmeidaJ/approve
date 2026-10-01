"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiFile,
  FiFolder,
  FiImage,
  FiLoader,
  FiPlus,
  FiUpload,
  FiVideo,
  FiX
} from "react-icons/fi";
import type { NextcloudFileItem } from "../lib/api";

export type SelectedNextcloudAsset = Pick<
  NextcloudFileItem,
  "name" | "path" | "mimeType" | "fileId" | "etag"
>;

function parentPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

function joinPath(base: string, name: string) {
  const cleanBase = base === "/" ? "" : base.replace(/\/$/, "");
  const cleanName = name.trim().replace(/^\/+|\/+$/g, "");
  return cleanName ? `${cleanBase}/${cleanName}` || "/" : base;
}

function filePreviewUrl(clientId: string, path: string) {
  const params = new URLSearchParams({ clientId, path });
  return `/api/nextcloud/file?${params.toString()}`;
}

function isSupported(item: NextcloudFileItem, imageOnly: boolean) {
  return Boolean(
    item.isDirectory ||
      item.mimeType?.startsWith("image/") ||
      (!imageOnly && item.mimeType?.startsWith("video/"))
  );
}

export function NextcloudAssetPicker({
  clientId,
  multiple,
  selected,
  onChange,
  initialPath = "/",
  context = "artwork"
}: {
  clientId: string;
  multiple: boolean;
  selected: SelectedNextcloudAsset[];
  onChange: (assets: SelectedNextcloudAsset[]) => void;
  initialPath?: string;
  context?: "artwork" | "client-logo";
}) {
  const imageOnly = context === "client-logo";
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState(initialPath || "/");
  const [items, setItems] = useState<NextcloudFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ clientId, path });

    setLoading(true);
    setError("");

    fetch(`/api/nextcloud/files?${params.toString()}`, {
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
        setItems(payload.filter((item) => isSupported(item, imageOnly)))
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
  }, [clientId, imageOnly, open, path, refreshKey]);

  const selectedPaths = useMemo(
    () => new Set(selected.map((asset) => asset.path)),
    [selected]
  );

  function toggleFile(item: NextcloudFileItem) {
    if (item.isDirectory) {
      setPath(item.path);
      return;
    }

    if (selectedPaths.has(item.path)) {
      onChange(selected.filter((asset) => asset.path !== item.path));
      return;
    }

    const nextAsset: SelectedNextcloudAsset = {
      name: item.name,
      path: item.path,
      mimeType: item.mimeType,
      fileId: item.fileId,
      etag: item.etag
    };

    onChange(multiple ? [...selected, nextAsset].slice(0, 10) : [nextAsset]);
    if (!multiple) setOpen(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError("");

    try {
      const body = new FormData();
      body.set("clientId", clientId);
      body.set("path", joinPath(path, uploadFolder));
      body.set("file", file, file.name);

      const response = await fetch("/api/nextcloud/upload", {
        method: "POST",
        body
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload?.message ?? payload?.error ?? "Falha ao enviar a arte.";
        throw new Error(
          Array.isArray(message) ? message.join(" ") : String(message)
        );
      }

      const item = payload as NextcloudFileItem;
      const nextAsset: SelectedNextcloudAsset = {
        name: item.name,
        path: item.path,
        mimeType: item.mimeType,
        fileId: item.fileId,
        etag: item.etag
      };

      onChange(multiple ? [...selected, nextAsset].slice(0, 10) : [nextAsset]);
      setRefreshKey((value) => value + 1);

      if (!multiple) setOpen(false);
    } catch (reason) {
      setUploadError(
        reason instanceof Error ? reason.message : "Falha ao enviar a arte."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="nextcloud-picker">
      <div className="nextcloud-picker-toolbar">
        <div>
          <span className="nextcloud-mark">NC</span>
          <span>
            <strong>
              {imageOnly ? "Logo do cliente" : "Artes no Nextcloud"}
            </strong>
            <small>
              {imageOnly
                ? "Escolha ou envie a marca usada na apresenta\u00e7\u00e3o do cliente."
                : multiple
                ? "Selecione ou envie até 10 arquivos para o carrossel."
                : "Selecione ou envie uma imagem ou vídeo."}
            </small>
          </span>
        </div>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => setOpen(true)}
        >
          <FiPlus aria-hidden="true" />
          {imageOnly ? "Selecionar logo" : "Selecionar arte"}
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="nextcloud-selected-assets">
          {selected.map((asset, index) => (
            <article key={asset.path}>
              <div className="nextcloud-selected-preview">
                {asset.mimeType?.startsWith("image/") ? (
                  <img src={filePreviewUrl(clientId, asset.path)} alt="" />
                ) : (
                  <FiVideo aria-hidden="true" />
                )}
              </div>
              <span>
                <small>
                  {imageOnly
                    ? "Logo selecionada"
                    : multiple
                      ? `Slide ${index + 1}`
                      : "Arte selecionada"}
                </small>
                <strong>{asset.name}</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((item) => item.path !== asset.path))
                }
                aria-label={`Remover ${asset.name}`}
              >
                <FiX aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="nextcloud-picker-empty">
          <FiImage aria-hidden="true" />
          <span>
            {imageOnly
              ? "Nenhuma logo selecionada."
              : "Nenhuma arte selecionada."}
          </span>
        </div>
      )}

      {open ? (
        <div className="nextcloud-browser-layer">
          <button
            type="button"
            className="nextcloud-browser-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Fechar Nextcloud"
          />
          <section className="nextcloud-browser">
            <header>
              <div>
                <span className="nextcloud-mark">NC</span>
                <span>
                  <strong>Selecionar no Nextcloud</strong>
                  <small>
                    Pasta do cliente · {path === "/" ? "raiz" : path}
                  </small>
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
              <span>{selected.length} selecionado(s)</span>
            </div>

            <div className="nextcloud-upload-strip">
              <div>
                <strong>
                  {imageOnly ? "Enviar uma nova logo" : "Enviar uma nova arte"}
                </strong>
                <small>
                  A arte será salva dentro da pasta do cliente configurada no cadastro.
                </small>
              </div>
              <label className="nextcloud-upload-folder">
                <span>Pasta nova (opcional)</span>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={(event) => setUploadFolder(event.target.value)}
                  placeholder={imageOnly ? "Ex.: Identidade visual" : "Ex.: Artes finais"}
                  disabled={uploading}
                />
              </label>
              <label className="button button-primary nextcloud-upload-button">
                <FiUpload aria-hidden="true" />
                {uploading ? "Enviando..." : "Enviar arquivo"}
                <input
                  type="file"
                  accept={imageOnly ? "image/*" : "image/*,video/*"}
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {uploadError ? (
              <div className="nextcloud-upload-error">{uploadError}</div>
            ) : null}

            <div className="nextcloud-browser-body">
              {loading ? (
                <div className="nextcloud-browser-state">
                  <FiLoader className="spin" aria-hidden="true" />
                  <span>Carregando arquivos...</span>
                </div>
              ) : error ? (
                <div className="nextcloud-browser-state error">
                  <FiFile aria-hidden="true" />
                  <strong>Não foi possível abrir esta pasta.</strong>
                  <span>{error}</span>
                </div>
              ) : items.length === 0 ? (
                <div className="nextcloud-browser-state">
                  <FiFolder aria-hidden="true" />
                  <span>Nenhuma imagem, vídeo ou pasta encontrada.</span>
                </div>
              ) : (
                <div className="nextcloud-file-grid">
                  {items.map((item) => {
                    const checked = selectedPaths.has(item.path);
                    const image = item.mimeType?.startsWith("image/");
                    const video = item.mimeType?.startsWith("video/");

                    return (
                      <button
                        type="button"
                        className={[
                          "nextcloud-file-card",
                          item.isDirectory ? "directory" : "",
                          checked ? "selected" : ""
                        ].filter(Boolean).join(" ")}
                        onClick={() => toggleFile(item)}
                        key={item.path}
                      >
                        <span className="nextcloud-file-preview">
                          {item.isDirectory ? (
                            <FiFolder aria-hidden="true" />
                          ) : image ? (
                            <img
                              src={filePreviewUrl(clientId, item.path)}
                              alt=""
                              loading="lazy"
                            />
                          ) : video ? (
                            <FiVideo aria-hidden="true" />
                          ) : (
                            <FiFile aria-hidden="true" />
                          )}
                        </span>
                        <span className="nextcloud-file-name">
                          <strong>{item.name}</strong>
                          <small>
                            {item.isDirectory ? "Pasta" : item.mimeType ?? "Arquivo"}
                          </small>
                        </span>
                        {checked ? (
                          <span className="nextcloud-file-check">
                            <FiCheck aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer>
              <span>
                {imageOnly
                  ? "A imagem ser\u00e1 usada na capa, no perfil e no rodap\u00e9 da apresenta\u00e7\u00e3o."
                  : multiple
                  ? "No carrossel, a ordem de seleção define a ordem dos slides."
                  : "A arte fica armazenada no Nextcloud e é vinculada ao calendário."}
              </span>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setOpen(false)}
                disabled={selected.length === 0}
              >
                Usar {selected.length || ""}{" "}
                {selected.length === 1 ? "arquivo" : "arquivos"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

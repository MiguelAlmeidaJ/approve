"use client";

import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiFolder,
  FiFolderPlus,
  FiLoader,
  FiX
} from "react-icons/fi";
import type { NextcloudFileItem } from "../lib/api";

function parentPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

function labelFromPath(path: string) {
  if (!path || path === "/") return "Nenhuma pasta selecionada";
  return path;
}

export function ClientNextcloudFolderPicker({
  initialPath = "",
  suggestedName = ""
}: {
  initialPath?: string | null;
  suggestedName?: string;
}) {
  const [selectedPath, setSelectedPath] = useState(initialPath ?? "");
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("/");
  const [folders, setFolders] = useState<NextcloudFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [folderName, setFolderName] = useState(suggestedName);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ path });

    setLoading(true);
    setError("");

    fetch(`/api/nextcloud/client-folders?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload?.message ??
            payload?.error ??
            "Não foi possível carregar as pastas do Nextcloud.";
          throw new Error(
            Array.isArray(message) ? message.join(" ") : String(message)
          );
        }

        return payload as NextcloudFileItem[];
      })
      .then(setFolders)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as pastas."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, path, refreshKey]);

  async function createFolder() {
    const name = folderName.trim();

    if (!name) {
      setError("Informe o nome da nova pasta.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/nextcloud/client-folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, name })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload?.message ??
          payload?.error ??
          "Não foi possível criar a pasta.";
        throw new Error(
          Array.isArray(message) ? message.join(" ") : String(message)
        );
      }

      const created = payload as NextcloudFileItem;
      setSelectedPath(created.path);
      setPath(created.path);
      setFolderName("");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a pasta."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="client-folder-picker">
      <input type="hidden" name="nextcloudPath" value={selectedPath} />

      <div className="client-folder-picker-value">
        <FiFolder aria-hidden="true" />
        <span>
          <small>Pasta selecionada</small>
          <strong>{labelFromPath(selectedPath)}</strong>
        </span>
        <button
          type="button"
          className="button button-ghost"
          onClick={() => {
            setPath("/");
            setOpen(true);
          }}
        >
          Escolher pasta
        </button>
      </div>

      <small className="field-helper">
        Escolha uma pasta existente dentro de NEXTCLOUD_ROOT_PATH ou crie uma
        nova sem precisar digitar o caminho manualmente.
      </small>

      {open ? (
        <div className="nextcloud-browser-layer">
          <button
            type="button"
            className="nextcloud-browser-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Fechar seletor de pasta"
          />
          <section className="nextcloud-browser client-folder-browser">
            <header>
              <div>
                <span className="nextcloud-mark">NC</span>
                <span>
                  <strong>Pasta do cliente</strong>
                  <small>
                    {path === "/"
                      ? "Raiz configurada no Nextcloud"
                      : path}
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
              <span>Somente pastas</span>
            </div>

            <div className="client-folder-create">
              <div>
                <FiFolderPlus aria-hidden="true" />
                <span>
                  <strong>Criar pasta aqui</strong>
                  <small>
                    A nova pasta será criada dentro de {path === "/" ? "raiz" : path}.
                  </small>
                </span>
              </div>
              <input
                type="text"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Ex.: LICITA BPO"
                disabled={creating}
              />
              <button
                type="button"
                className="button button-primary"
                onClick={() => void createFolder()}
                disabled={creating || !folderName.trim()}
              >
                <FiFolderPlus aria-hidden="true" />
                {creating ? "Criando..." : "Criar pasta"}
              </button>
            </div>

            {error ? (
              <div className="nextcloud-upload-error">{error}</div>
            ) : null}

            <div className="nextcloud-browser-body">
              {loading ? (
                <div className="nextcloud-browser-state">
                  <FiLoader className="spin" aria-hidden="true" />
                  <span>Carregando pastas...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="nextcloud-browser-state">
                  <FiFolder aria-hidden="true" />
                  <strong>Nenhuma subpasta encontrada.</strong>
                  <span>Crie uma pasta acima ou volte para outro nível.</span>
                </div>
              ) : (
                <div className="nextcloud-file-grid">
                  {folders.map((folder) => (
                    <button
                      type="button"
                      className={[
                        "nextcloud-file-card",
                        "directory",
                        selectedPath === folder.path ? "selected" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setPath(folder.path)}
                      key={folder.path}
                    >
                      <span className="nextcloud-file-preview">
                        <FiFolder aria-hidden="true" />
                      </span>
                      <span className="nextcloud-file-name">
                        <strong>{folder.name}</strong>
                        <small>{folder.path}</small>
                      </span>
                      {selectedPath === folder.path ? (
                        <span className="nextcloud-file-check">
                          <FiCheck aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <footer>
              <span>
                Abra uma pasta para navegar. Quando estiver na pasta desejada,
                confirme abaixo.
              </span>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  if (path !== "/") setSelectedPath(path);
                  setOpen(false);
                }}
                disabled={path === "/"}
              >
                <FiCheck aria-hidden="true" />
                Usar esta pasta
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

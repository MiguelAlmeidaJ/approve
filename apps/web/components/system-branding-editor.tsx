"use client";

import { useState } from "react";
import { FiCheckCircle, FiImage, FiSave } from "react-icons/fi";
import { updateSystemBranding } from "../app/actions";
import type { SystemBranding } from "../lib/api";
import {
  SystemNextcloudImagePicker,
  type SystemImageSelection
} from "./system-nextcloud-image-picker";

export function SystemBrandingEditor({
  branding
}: {
  branding: SystemBranding;
}) {
  const [logo, setLogo] = useState<SystemImageSelection>(
    branding.logoPath
      ? { path: branding.logoPath, name: branding.logoName ?? "Logo" }
      : null
  );
  const [favicon, setFavicon] = useState<SystemImageSelection>(
    branding.faviconPath
      ? { path: branding.faviconPath, name: branding.faviconName ?? "Favicon" }
      : null
  );

  return (
    <form action={updateSystemBranding} className="branding-settings">
      <input type="hidden" name="logoPath" value={logo?.path ?? ""} />
      <input type="hidden" name="logoName" value={logo?.name ?? ""} />
      <input type="hidden" name="faviconPath" value={favicon?.path ?? ""} />
      <input type="hidden" name="faviconName" value={favicon?.name ?? ""} />

      <section className="branding-preview-card">
        <div className="branding-preview-head">
          <div>
            <span className="micro-label">PRÉ-VISUALIZAÇÃO</span>
            <h2>Identidade aplicada</h2>
          </div>
          <span className="branding-preview-status">
            <FiCheckCircle aria-hidden="true" />
            Atualização global
          </span>
        </div>

        <div className="branding-preview-grid">
          <article>
            <small>Logo do sistema</small>
            <div className="branding-logo-preview">
              <img
                src={
                  logo
                    ? `/api/nextcloud/system-file?path=${encodeURIComponent(
                        logo.path
                      )}`
                    : "/brand-terceiro-andar.svg"
                }
                alt="Prévia da logo"
              />
            </div>
          </article>

          <article>
            <small>Favicon</small>
            <div className="branding-favicon-preview">
              {favicon ? (
                <img
                  src={`/api/nextcloud/system-file?path=${encodeURIComponent(
                    favicon.path
                  )}`}
                  alt="Prévia do favicon"
                />
              ) : (
                <FiImage aria-hidden="true" />
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="branding-source-card">
        <div className="branding-source-head">
          <div>
            <span className="micro-label">NEXTCLOUD</span>
            <h2>Arquivos da identidade</h2>
            <p>
              Escolha os arquivos diretamente do Nextcloud. O sistema passa a
              usar essas imagens no menu, telas públicas e navegador.
            </p>
          </div>
        </div>

        <div className="branding-picker-grid">
          <SystemNextcloudImagePicker
            label="Logo principal"
            description="Recomendado: SVG ou PNG horizontal com fundo transparente."
            value={logo}
            onChange={setLogo}
          />
          <SystemNextcloudImagePicker
            label="Favicon"
            description="Recomendado: PNG ou SVG quadrado, com boa leitura em tamanhos pequenos."
            value={favicon}
            onChange={setFavicon}
          />
        </div>
      </section>

      <div className="branding-save-bar">
        <div>
          <strong>Aplicação da identidade</strong>
          <span>
            A logo será usada em todo o sistema e nas telas apresentadas ao cliente.
          </span>
        </div>
        <button type="submit" className="button button-primary">
          <FiSave aria-hidden="true" />
          Salvar identidade visual
        </button>
      </div>
    </form>
  );
}

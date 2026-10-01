"use client";

import { useState } from "react";
import { FiCheck } from "react-icons/fi";
import { updateStandaloneArtworkStatus } from "../app/actions";
import type { StandaloneArtworkStatus } from "../lib/api";
import {
  NextcloudAssetPicker,
  type SelectedNextcloudAsset
} from "./nextcloud-asset-picker";

function initialFolder(path: string | null) {
  if (!path) return "/";
  const parts = path.split("/").filter(Boolean);
  const last = parts.at(-1) ?? "";
  if (/\.[A-Za-z0-9]{2,8}$/.test(last)) {
    parts.pop();
  }
  return parts.length ? `/${parts.join("/")}` : "/";
}

const statusLabels: Record<StandaloneArtworkStatus, string> = {
  REQUESTED: "Solicitada",
  IN_PRODUCTION: "Em produção",
  IN_APPROVAL: "Em aprovação",
  CHANGES_REQUESTED: "Ajustes solicitados",
  APPROVED: "Aprovada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada"
};

export function StandaloneArtworkStatusForm({
  id,
  clientId,
  status,
  currentPath,
  embedded = false,
  onSaved
}: {
  id: string;
  clientId: string;
  status: StandaloneArtworkStatus;
  currentPath: string | null;
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const [assets, setAssets] = useState<SelectedNextcloudAsset[]>([]);
  const selectedPath = assets[0]?.path ?? currentPath ?? "";

  async function submit(formData: FormData) {
    await updateStandaloneArtworkStatus(formData);
    onSaved?.();
  }

  return (
    <form
      action={submit}
      className={
        embedded
          ? "standalone-workflow-form standalone-workflow-form-embedded"
          : "standalone-workflow-form"
      }
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="nextcloudPath" value={selectedPath} />

      <div className="standalone-status-form">
        <select name="status" defaultValue={status}>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="button button-ghost">
          <FiCheck aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <NextcloudAssetPicker
        clientId={clientId}
        multiple={false}
        selected={assets}
        onChange={setAssets}
        initialPath={initialFolder(currentPath)}
      />
    </form>
  );
}

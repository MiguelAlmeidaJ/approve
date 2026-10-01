"use client";

import { useState } from "react";
import { FiEdit3 } from "react-icons/fi";
import type { StandaloneArtworkStatus } from "../lib/api";
import { AppModal } from "./app-modal";
import { StandaloneArtworkStatusForm } from "./standalone-artwork-status";

export function StandaloneArtworkEditModal({
  id,
  clientId,
  title,
  status,
  currentPath
}: {
  id: string;
  clientId: string;
  title: string;
  status: StandaloneArtworkStatus;
  currentPath: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="button button-ghost standalone-edit-trigger"
        onClick={() => setOpen(true)}
      >
        <FiEdit3 aria-hidden="true" />
        Editar
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="EDITAR DEMANDA"
        title={title}
      >
        <p className="app-modal-intro">
          Atualize o status da demanda e selecione o arquivo correspondente no Nextcloud.
        </p>
        <StandaloneArtworkStatusForm
          id={id}
          clientId={clientId}
          status={status}
          currentPath={currentPath}
          embedded
          onSaved={() => setOpen(false)}
        />
      </AppModal>
    </>
  );
}

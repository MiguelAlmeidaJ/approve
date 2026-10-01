"use client";

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import type { ContractUsage } from "../lib/api";
import { AppModal } from "./app-modal";
import { StandaloneArtworkCreateForm } from "./standalone-artwork-create-form";

type ClientOption = {
  id: string;
  name: string;
  assignedDesignerId: string | null;
  defaultStandaloneSlaHours: number;
};

type DesignerOption = {
  id: string;
  name: string;
  usedPoints: number;
  capacityPoints: number;
};

export function StandaloneArtworkCreateModal({
  clients,
  designers,
  contractUsage,
  actor
}: {
  clients: ClientOption[];
  designers: DesignerOption[];
  contractUsage: ContractUsage[];
  actor: {
    id: string;
    name: string;
    role: "DESIGNER" | "ADMIN" | "DEV";
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={() => setOpen(true)}
      >
        <FiPlus aria-hidden="true" />
        Nova arte avulsa
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="NOVA DEMANDA"
        title="Criar arte avulsa"
        size="large"
      >
        <StandaloneArtworkCreateForm
          clients={clients}
          designers={designers}
          contractUsage={contractUsage}
          actor={actor}
          embedded
          onCreated={() => setOpen(false)}
        />
      </AppModal>
    </>
  );
}

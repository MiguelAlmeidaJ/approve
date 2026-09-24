"use client";

import { useState } from "react";
import { FiCheck, FiEdit3, FiX } from "react-icons/fi";
import { submitReview } from "../app/p/[token]/actions";

type ReviewMode = "approve" | "changes" | null;

export function PublicReviewActions({
  token,
  itemId,
  defaultName,
  approved
}: {
  token: string;
  itemId: string;
  defaultName?: string;
  approved: boolean;
}) {
  const [mode, setMode] = useState<ReviewMode>(null);

  async function handleSubmit(formData: FormData) {
    await submitReview(formData);
    setMode(null);
  }

  return (
    <>
      <div className="public-review-actions">
        <button
          type="button"
          className="button button-dark"
          onClick={() => setMode("approve")}
          disabled={approved}
        >
          <FiCheck aria-hidden="true" />
          {approved ? "Conteúdo aprovado" : "Aprovar"}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => setMode("changes")}
        >
          <FiEdit3 aria-hidden="true" />
          Enviar para alteração
        </button>
      </div>

      {mode ? (
        <div className="review-dialog-layer" role="presentation">
          <button
            type="button"
            className="review-dialog-backdrop"
            onClick={() => setMode(null)}
            aria-label="Fechar"
          />
          <section
            className="review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
          >
            <header>
              <div>
                <span className="micro-label">
                  {mode === "approve" ? "APROVAR CONTEÚDO" : "SOLICITAR ALTERAÇÃO"}
                </span>
                <h2 id="review-dialog-title">
                  {mode === "approve"
                    ? "Confirmar aprovação"
                    : "Enviar para alteração"}
                </h2>
                <p>
                  {mode === "approve"
                    ? "Informe seu nome para registrar a aprovação."
                    : "Informe seu nome e descreva o que precisa ser ajustado."}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setMode(null)}
                aria-label="Fechar"
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <form action={handleSubmit}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="itemId" value={itemId} />
              <input
                type="hidden"
                name="action"
                value={mode === "approve" ? "APPROVED" : "CHANGES_REQUESTED"}
              />

              <label className="field">
                <span>Seu nome</span>
                <input
                  name="reviewerName"
                  defaultValue={defaultName ?? ""}
                  placeholder="Digite seu nome"
                  autoFocus
                  required
                />
              </label>

              {mode === "changes" ? (
                <label className="field">
                  <span>Motivo da alteração</span>
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={4000}
                    placeholder="Explique o que precisa ser ajustado..."
                    required
                  />
                </label>
              ) : null}

              <div className="review-dialog-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setMode(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={
                    mode === "approve"
                      ? "button button-dark"
                      : "button button-primary"
                  }
                >
                  {mode === "approve" ? (
                    <FiCheck aria-hidden="true" />
                  ) : (
                    <FiEdit3 aria-hidden="true" />
                  )}
                  {mode === "approve"
                    ? "Confirmar aprovação"
                    : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

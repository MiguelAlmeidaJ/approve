"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";

export function AppModal({
  open,
  title,
  eyebrow,
  onClose,
  children,
  size = "medium"
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "medium" | "large";
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className="app-modal-backdrop"
        aria-label="Fechar modal"
        onClick={onClose}
      />
      <section
        className={`app-modal-card ${size === "large" ? "large" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="app-modal-head">
          <div>
            {eyebrow ? <span className="micro-label">{eyebrow}</span> : null}
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div className="app-modal-body">{children}</div>
      </section>
    </div>
  );
}

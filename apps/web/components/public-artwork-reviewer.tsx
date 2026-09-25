"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMessageCircle,
  FiX
} from "react-icons/fi";
import type { ContentItem } from "../lib/api";
import { submitArtworkAnnotation } from "../app/p/[token]/actions";
import { ProtectedPublicVideo } from "./protected-public-media";

type Asset = ContentItem["assets"][number];

function mediaUrl(assetId: string, token: string) {
  return `/api/media/${assetId}?share=${encodeURIComponent(token)}`;
}

export function PublicArtworkReviewer({
  token,
  item,
  defaultName,
  canAnnotate
}: {
  token: string;
  item: ContentItem;
  defaultName?: string;
  canAnnotate: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pendingPoint, setPendingPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const assets = item.assets ?? [];
  const asset = assets[index] as Asset | undefined;
  const annotations = useMemo(
    () =>
      (item.annotations ?? []).filter(
        (annotation) =>
          !asset?.id ||
          annotation.assetId === asset.id ||
          annotation.assetId === null
      ),
    [asset?.id, item.annotations]
  );

  function previous() {
    setPendingPoint(null);
    setIndex((value) => (value <= 0 ? assets.length - 1 : value - 1));
  }

  function next() {
    setPendingPoint(null);
    setIndex((value) => (value >= assets.length - 1 ? 0 : value + 1));
  }

  function placePoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!canAnnotate || !asset || asset.mimeType?.startsWith("video/")) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 10000;
    const y = ((event.clientY - rect.top) / rect.height) * 10000;

    setPendingPoint({
      x: Math.max(0, Math.min(10000, x)),
      y: Math.max(0, Math.min(10000, y))
    });
  }

  async function submit(formData: FormData) {
    await submitArtworkAnnotation(formData);
    setPendingPoint(null);
    router.refresh();
  }

  if (!asset) {
    return (
      <div className="public-art-reviewer-empty">
        Esta peça ainda não possui mídia disponível.
      </div>
    );
  }

  const isVideo = asset.mimeType?.startsWith("video/");

  return (
    <div className="public-art-reviewer">
      <div
        className={[
          "public-art-reviewer-stage",
          canAnnotate && !isVideo ? "annotatable" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={placePoint}
        onContextMenu={(event) => event.preventDefault()}
      >
        {isVideo ? (
          <ProtectedPublicVideo
            src={mediaUrl(asset.id, token)}
            controls
          />
        ) : (
          <img
            src={mediaUrl(asset.id, token)}
            alt={item.title}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
          />
        )}

        {!isVideo
          ? annotations.map((annotation, annotationIndex) => (
              <button
                type="button"
                className={
                  annotation.resolvedAt
                    ? "art-annotation-pin resolved"
                    : "art-annotation-pin"
                }
                style={{
                  left: `${annotation.x}%`,
                  top: `${annotation.y}%`
                }}
                title={`${annotation.authorName || "Cliente"}: ${annotation.message}`}
                onClick={(event) => event.stopPropagation()}
                key={annotation.id}
              >
                {annotationIndex + 1}
              </button>
            ))
          : null}

        {pendingPoint && !isVideo ? (
          <span
            className="art-annotation-pin pending"
            style={{
              left: `${pendingPoint.x / 100}%`,
              top: `${pendingPoint.y / 100}%`
            }}
          >
            +
          </span>
        ) : null}

        {assets.length > 1 ? (
          <>
            <button
              type="button"
              className="public-art-nav previous"
              onClick={(event) => {
                event.stopPropagation();
                previous();
              }}
              aria-label="Mídia anterior"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="public-art-nav next"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              aria-label="Próxima mídia"
            >
              <FiChevronRight />
            </button>
            <span className="public-art-counter">
              {index + 1}/{assets.length}
            </span>
          </>
        ) : null}
      </div>

      {canAnnotate && !isVideo ? (
        <div className="public-art-annotation-help">
          <FiMessageCircle aria-hidden="true" />
          <span>
            Clique diretamente na arte para marcar o ponto que precisa de ajuste.
          </span>
        </div>
      ) : null}

      {isVideo && canAnnotate ? (
        <div className="public-art-annotation-help">
          <FiMessageCircle aria-hidden="true" />
          <span>
            Para vídeos, descreva o ajuste no campo de alteração. Marcações por
            ponto estão disponíveis para imagens.
          </span>
        </div>
      ) : null}

      {pendingPoint ? (
        <form action={submit} className="public-art-annotation-form">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="assetId" value={asset.id} />
          <input
            type="hidden"
            name="x"
            value={Math.round(pendingPoint.x)}
          />
          <input
            type="hidden"
            name="y"
            value={Math.round(pendingPoint.y)}
          />

          <div className="public-art-annotation-form-head">
            <strong>Marcação na arte</strong>
            <button
              type="button"
              onClick={() => setPendingPoint(null)}
              aria-label="Cancelar marcação"
            >
              <FiX />
            </button>
          </div>

          <label className="field">
            <span>Seu nome</span>
            <input
              name="authorName"
              defaultValue={defaultName ?? ""}
              placeholder="Digite seu nome"
              required
            />
          </label>

          <label className="field">
            <span>O que precisa mudar neste ponto?</span>
            <textarea
              name="message"
              rows={3}
              maxLength={4000}
              placeholder="Ex.: trocar o telefone, aumentar o logo, ajustar este texto..."
              required
              autoFocus
            />
          </label>

          <button type="submit" className="button button-primary button-wide">
            Salvar marcação
          </button>
        </form>
      ) : null}

      {annotations.length > 0 ? (
        <div className="public-art-annotation-list">
          <strong>Marcações desta mídia</strong>
          {annotations.map((annotation, annotationIndex) => (
            <article key={annotation.id}>
              <span>{annotationIndex + 1}</span>
              <div>
                <strong>{annotation.authorName || "Cliente"}</strong>
                <p>{annotation.message}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

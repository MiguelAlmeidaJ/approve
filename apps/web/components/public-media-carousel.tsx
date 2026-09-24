"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  ProtectedPublicImage,
  ProtectedPublicVideo
} from "./protected-public-media";

type CarouselAsset = {
  id: string;
  mimeType: string | null;
};

export function PublicMediaCarousel({
  assets,
  token,
  title
}: {
  assets: CarouselAsset[];
  token: string;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const current = assets[index];

  if (!current) {
    return null;
  }

  const src = `/api/media/${current.id}?share=${encodeURIComponent(token)}`;
  const canNavigate = assets.length > 1;

  function previous() {
    setIndex((value) => (value - 1 + assets.length) % assets.length);
  }

  function next() {
    setIndex((value) => (value + 1) % assets.length);
  }

  return (
    <div className="instagram-carousel-media">
      <div className="instagram-carousel-slide">
        {current.mimeType?.startsWith("video/") ? (
          <ProtectedPublicVideo key={current.id} src={src} controls />
        ) : (
          <ProtectedPublicImage src={src} alt={title} />
        )}
      </div>

      {canNavigate ? (
        <>
          <button
            type="button"
            className="instagram-carousel-arrow previous"
            onClick={previous}
            aria-label="Imagem anterior"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="instagram-carousel-arrow next"
            onClick={next}
            aria-label="Próxima imagem"
          >
            <FiChevronRight aria-hidden="true" />
          </button>

          <div className="instagram-carousel-progress" aria-hidden="true">
            {assets.map((asset, assetIndex) => (
              <span
                className={assetIndex === index ? "active" : ""}
                key={asset.id}
              />
            ))}
          </div>

          <span className="instagram-carousel-counter">
            {index + 1}/{assets.length}
          </span>
        </>
      ) : null}
    </div>
  );
}

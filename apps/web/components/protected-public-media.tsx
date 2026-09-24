"use client";

import type { MouseEvent, SyntheticEvent } from "react";

function stopContextMenu(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
}

function stopDrag(event: SyntheticEvent<HTMLElement>) {
  event.preventDefault();
}

export function ProtectedPublicImage({
  src,
  alt,
  className
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className="protected-public-media"
      onContextMenu={stopContextMenu}
      onDragStart={stopDrag}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={false}
        decoding="async"
      />
      <span className="protected-public-media-shield" aria-hidden="true" />
    </span>
  );
}

export function ProtectedPublicVideo({
  src,
  className,
  controls = false
}: {
  src: string;
  className?: string;
  controls?: boolean;
}) {
  return (
    <span
      className="protected-public-media"
      onContextMenu={stopContextMenu}
      onDragStart={stopDrag}
    >
      <video
        src={src}
        className={className}
        controls={controls}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        muted={!controls}
        autoPlay={!controls}
        loop={!controls}
        preload="metadata"
      />
      {controls ? null : (
        <span className="protected-public-media-shield" aria-hidden="true" />
      )}
    </span>
  );
}

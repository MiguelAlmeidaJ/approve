"use client";

import { useRef, useState } from "react";
import type { MouseEvent, SyntheticEvent } from "react";
import {
  FiPause,
  FiPlay,
  FiRotateCcw,
  FiVolume2,
  FiVolumeX
} from "react-icons/fi";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }

      void video.play();
    } else {
      video.pause();
    }
  }

  function rewind() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = Math.max(0, video.currentTime - 10);
  }

  function toggleMute() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <span
      className={[
        "protected-public-media",
        controls ? "protected-public-video-interactive" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      onContextMenu={stopContextMenu}
      onDragStart={stopDrag}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        controls={false}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        muted={muted}
        autoPlay
        loop={!controls}
        preload="metadata"
        onClick={controls ? togglePlayback : undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      />

      {controls ? (
        <span className="public-video-controls">
          <button
            type="button"
            onClick={rewind}
            aria-label="Voltar 10 segundos"
            title="Voltar 10 segundos"
          >
            <FiRotateCcw aria-hidden="true" />
            <small>10</small>
          </button>
          <button
            type="button"
            className="public-video-play"
            onClick={togglePlayback}
            aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
            title={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? (
              <FiPause aria-hidden="true" />
            ) : (
              <FiPlay aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Ativar som" : "Mutar vídeo"}
            title={muted ? "Ativar som" : "Mutar"}
          >
            {muted ? (
              <FiVolumeX aria-hidden="true" />
            ) : (
              <FiVolume2 aria-hidden="true" />
            )}
          </button>
        </span>
      ) : (
        <span className="protected-public-media-shield" aria-hidden="true" />
      )}
    </span>
  );
}

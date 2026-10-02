"use client";

export function Brand({
  compact = false,
  tone = "light"
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const src =
    tone === "dark"
      ? "/api/branding/logo-dark?v=20261002"
      : "/api/branding/logo?v=20261002";
  const fallbackSrc =
    tone === "dark"
      ? "/brand-terceiro-andar-dark.svg"
      : "/brand-terceiro-andar.svg";

  return (
    <div
      className={[
        "brand",
        compact ? "brand-compact" : "",
        `brand-${tone}`
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        src={src}
        alt="Terceiro Andar"
        className="brand-logo"
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.src.endsWith(fallbackSrc)) {
            return;
          }

          event.currentTarget.src = fallbackSrc;
        }}
      />
    </div>
  );
}

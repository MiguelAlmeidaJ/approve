export function Brand({
  compact = false,
  tone = "light"
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const src =
    tone === "dark"
      ? "/api/branding/logo?tone=dark"
      : "/api/branding/logo";

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
      />
    </div>
  );
}

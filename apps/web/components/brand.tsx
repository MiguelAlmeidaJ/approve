export function Brand({
  compact = false,
  tone = "light"
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const src =
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
      />
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <div className="brand-mark" aria-hidden="true">
        <div className="brand-mark-top">
          <span />
          <span />
        </div>
        <span className="brand-bar brand-bar-middle" />
        <span className="brand-bar brand-bar-bottom" />
      </div>
      {!compact ? (
        <div className="brand-name" aria-label="Terceiro Andar">
          <span>terceiro</span>
          <strong>andar</strong>
        </div>
      ) : null}
    </div>
  );
}

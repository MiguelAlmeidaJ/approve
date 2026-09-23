export function Brand() {
  return (
    <div className="brand" aria-label="Terceiro Andar">
      <div className="brand-mark" aria-hidden="true">
        <div className="brand-mark-top">
          <span />
          <span />
        </div>
        <span className="brand-bar brand-bar-middle" />
        <span className="brand-bar brand-bar-bottom" />
      </div>
      <div className="brand-name">
        <span>terceiro</span>
        <strong>andar</strong>
      </div>
    </div>
  );
}

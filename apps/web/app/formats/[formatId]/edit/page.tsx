import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiMonitor, FiSmartphone } from "react-icons/fi";
import { AppShell } from "../../../../components/app-shell";
import { updateContentFormat } from "../../../actions";
import { requireRole } from "../../../../lib/auth";
import { getFormats } from "../../../../lib/api";

export default async function EditFormatPage({
  params
}: {
  params: Promise<{ formatId: string }>;
}) {
  const { formatId } = await params;
  const designer = await requireRole("ADMIN", "DEV");
  const formats = await getFormats();
  const format = formats.find((item) => item.id === formatId);

  if (!format) {
    notFound();
  }

  return (
    <AppShell designer={designer} activeSection="formats">
      <header className="page-header compact-header">
        <div>
          <Link href="/formats" className="back-link">
            <FiArrowLeft aria-hidden="true" />
            Formatos
          </Link>
          <span className="micro-label">EDITAR FORMATO</span>
          <h1>{format.name}</h1>
          <p>Atualize dimensões, tipo e compatibilidades deste formato.</p>
        </div>
      </header>

      <section className="form-surface narrow-surface">
        <form action={updateContentFormat} className="stack-form">
          <input type="hidden" name="formatId" value={format.id} />

          <label className="field">
            <span>Nome</span>
            <input name="name" defaultValue={format.name} required />
          </label>

          <label className="field">
            <span>Tipo</span>
            <select name="contentType" defaultValue={format.contentType}>
              <option value="POST">Post</option>
              <option value="CAROUSEL">Carrossel</option>
              <option value="REEL">Reels</option>
              <option value="STORY">Stories</option>
            </select>
          </label>

          <div className="form-inline">
            <label className="field">
              <span>Largura</span>
              <input type="number" name="width" min={1} defaultValue={format.width} required />
            </label>
            <label className="field">
              <span>Altura</span>
              <input type="number" name="height" min={1} defaultValue={format.height} required />
            </label>
          </div>

          <div className="format-placement-options">
            <label>
              <input
                type="checkbox"
                name="supportsFeed"
                defaultChecked={format.supportsFeed}
              />
              <FiMonitor aria-hidden="true" />
              Feed
            </label>
            <label>
              <input
                type="checkbox"
                name="supportsStories"
                defaultChecked={format.supportsStories}
              />
              <FiSmartphone aria-hidden="true" />
              Stories
            </label>
            <label>
              <input
                type="checkbox"
                name="active"
                defaultChecked={format.active}
              />
              Ativo
            </label>
          </div>

          <div className="form-actions">
            <Link href="/formats" className="button button-ghost">
              Cancelar
            </Link>
            <button type="submit" className="button button-primary">
              Salvar formato
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

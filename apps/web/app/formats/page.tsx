import Link from "next/link";
import {
  FiEdit3,
  FiImage,
  FiMonitor,
  FiPlus,
  FiSmartphone
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { createContentFormat } from "../actions";
import { requireRole } from "../../lib/auth";
import { getFormats } from "../../lib/api";

const typeLabel = {
  POST: "Post",
  CAROUSEL: "Carrossel",
  REEL: "Reels",
  STORY: "Stories"
} as const;

export default async function FormatsPage() {
  const designer = await requireRole("ADMIN", "DEV");
  const formats = await getFormats();

  return (
    <AppShell designer={designer} activeSection="formats">
      <header className="page-header">
        <div>
          <span className="micro-label">FORMATOS</span>
          <h1>Formatos</h1>
          <p>
            Padronize dimensões e compatibilidades para acelerar o cadastro das
            peças nos calendários.
          </p>
        </div>
      </header>

      <section className="format-management-layout">
        <div>
          <div className="section-title-row">
            <h2>Formatos cadastrados</h2>
            <span>{formats.length} no total</span>
          </div>

          <div className="format-card-grid">
            {formats.map((format) => (
              <article
                className={format.active ? "format-card" : "format-card inactive"}
                key={format.id}
              >
                <div className="format-card-preview">
                  <FiImage aria-hidden="true" />
                  <span>
                    {format.width} × {format.height}
                  </span>
                </div>

                <div className="format-card-copy">
                  <span className="role-chip">
                    {typeLabel[format.contentType]}
                  </span>
                  <h3>{format.name}</h3>
                  <div className="format-destinations">
                    {format.supportsFeed ? (
                      <span><FiMonitor /> Feed</span>
                    ) : null}
                    {format.supportsStories ? (
                      <span><FiSmartphone /> Stories</span>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={`/formats/${format.id}/edit`}
                  className="icon-button"
                  aria-label={`Editar ${format.name}`}
                >
                  <FiEdit3 aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <aside className="form-surface format-create-panel">
          <span className="micro-label">NOVO FORMATO</span>
          <h2>Cadastrar</h2>
          <p>
            Defina o tipo, dimensões e onde este formato pode ser utilizado.
          </p>

          <form action={createContentFormat} className="stack-form">
            <label className="field">
              <span>Nome</span>
              <input name="name" placeholder="Ex.: Post vertical" required />
            </label>

            <label className="field">
              <span>Tipo</span>
              <select name="contentType" defaultValue="POST">
                <option value="POST">Post</option>
                <option value="CAROUSEL">Carrossel</option>
                <option value="REEL">Reels</option>
                <option value="STORY">Stories</option>
              </select>
            </label>

            <div className="form-inline">
              <label className="field">
                <span>Largura</span>
                <input type="number" name="width" min={1} defaultValue={1080} required />
              </label>
              <label className="field">
                <span>Altura</span>
                <input type="number" name="height" min={1} defaultValue={1350} required />
              </label>
            </div>

            <div className="format-placement-options">
              <label>
                <input type="checkbox" name="supportsFeed" defaultChecked />
                <FiMonitor aria-hidden="true" />
                Feed
              </label>
              <label>
                <input type="checkbox" name="supportsStories" />
                <FiSmartphone aria-hidden="true" />
                Stories
              </label>
            </div>

            <button type="submit" className="button button-primary">
              <FiPlus aria-hidden="true" />
              Criar formato
            </button>
          </form>
        </aside>
      </section>
    </AppShell>
  );
}

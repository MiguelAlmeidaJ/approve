import Link from "next/link";
import { FiEdit3, FiFileText, FiPlus, FiX } from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import {
  createBriefingTemplate,
  updateBriefingTemplate
} from "../actions";
import { requireRole } from "../../lib/auth";
import { getBriefingTemplates, type BriefingTemplate } from "../../lib/api";

function TemplateForm({ template }: { template?: BriefingTemplate }) {
  const editing = Boolean(template);
  return (
    <form
      action={editing ? updateBriefingTemplate : createBriefingTemplate}
      className="template-form"
    >
      {template ? <input type="hidden" name="id" value={template.id} /> : null}
      <div className="template-form-grid">
        <label className="field field-span-2">
          <span>Nome do modelo</span>
          <input
            name="name"
            defaultValue={template?.name ?? ""}
            placeholder="Ex.: Depoimento de cliente"
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select name="contentType" defaultValue={template?.contentType ?? "POST"}>
            <option value="POST">Post</option>
            <option value="CAROUSEL">Carrossel</option>
            <option value="REEL">Reels</option>
            <option value="STORY">Stories</option>
          </select>
        </label>
        <label className="field">
          <span>Nicho sugerido</span>
          <input name="niche" defaultValue={template?.niche ?? ""} placeholder="Opcional" />
        </label>
        <label className="field field-span-2">
          <span>Descrição</span>
          <textarea name="description" rows={2} defaultValue={template?.description ?? ""} />
        </label>
        <label className="field">
          <span>Tema</span>
          <input name="theme" defaultValue={template?.theme ?? ""} />
        </label>
        <label className="field">
          <span>Headline base</span>
          <input name="headline" defaultValue={template?.headline ?? ""} />
        </label>
        <label className="field field-span-2">
          <span>Subheadline base</span>
          <input name="subheadline" defaultValue={template?.subheadline ?? ""} />
        </label>
        <label className="field field-span-2">
          <span>Legenda base</span>
          <textarea name="caption" rows={4} defaultValue={template?.caption ?? ""} />
        </label>
        <label className="field field-span-2">
          <span>Orientações para o designer</span>
          <textarea name="designerNotes" rows={3} defaultValue={template?.designerNotes ?? ""} />
        </label>
        <label className="template-check">
          <input type="checkbox" name="publishToFeed" defaultChecked={template?.publishToFeed ?? true} />
          <span>Feed</span>
        </label>
        <label className="template-check">
          <input type="checkbox" name="publishToStories" defaultChecked={template?.publishToStories ?? false} />
          <span>Stories</span>
        </label>
        {editing ? (
          <label className="template-check field-span-2">
            <input type="checkbox" name="active" defaultChecked={template?.active ?? true} />
            <span>Modelo ativo</span>
          </label>
        ) : null}
      </div>
      <div className="form-actions">
        <Link href="/modelos" className="button button-ghost">Cancelar</Link>
        <button type="submit" className="button button-primary">
          {editing ? "Salvar modelo" : "Criar modelo"}
        </button>
      </div>
    </form>
  );
}

export default async function TemplatesPage({
  searchParams
}: {
  searchParams: Promise<{ create?: string; edit?: string }>;
}) {
  const designer = await requireRole("ADMIN", "DEV");
  const templates = await getBriefingTemplates();
  const { create, edit } = await searchParams;
  const selected = templates.find((template) => template.id === edit);
  const showModal = create === "1" || Boolean(selected);

  return (
    <AppShell designer={designer} activeSection="templates">
      <header className="page-header">
        <div>
          <span className="micro-label">BIBLIOTECA EDITORIAL</span>
          <h1>Modelos de pauta</h1>
          <p>Reaproveite estruturas de conteúdo recorrentes sem começar do zero.</p>
        </div>
        <Link href="/modelos?create=1" className="button button-primary" scroll={false}>
          <FiPlus /> Novo modelo
        </Link>
      </header>

      <section className="template-grid">
        {templates.map((template) => (
          <article className={template.active ? "template-card" : "template-card inactive"} key={template.id}>
            <span className="template-card-icon"><FiFileText /></span>
            <div>
              <span className="micro-label">{template.contentType}</span>
              <h3>{template.name}</h3>
              <p>{template.description || template.theme || "Modelo de briefing"}</p>
              <small>{template.niche || "Todos os nichos"}</small>
            </div>
            <Link href={`/modelos?edit=${template.id}`} className="button button-ghost button-small" scroll={false}>
              <FiEdit3 /> Editar
            </Link>
          </article>
        ))}
      </section>

      {showModal ? (
        <div className="modal-layer">
          <Link href="/modelos" className="modal-backdrop" aria-label="Fechar" scroll={false} />
          <section className="user-edit-modal template-modal" role="dialog" aria-modal="true">
            <div className="user-edit-heading">
              <div>
                <span className="micro-label">{selected ? "EDITAR MODELO" : "NOVO MODELO"}</span>
                <h2>{selected?.name ?? "Criar modelo de pauta"}</h2>
                <p>Defina uma estrutura reutilizável para acelerar o pré-calendário.</p>
              </div>
              <Link href="/modelos" className="modal-close" aria-label="Fechar" scroll={false}><FiX /></Link>
            </div>
            <TemplateForm template={selected} />
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

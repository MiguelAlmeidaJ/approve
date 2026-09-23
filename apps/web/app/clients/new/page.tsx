import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { createClient } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import { getDesigners } from "../../../lib/api";

export default async function NewClientPage() {
  const designer = await requireDesigner();
  const designers =
    designer.role === "DESIGNER" ? [] : await getDesigners();

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="page-header compact-header">
        <div>
          <Link href="/clients" className="back-link">
            ← Clientes
          </Link>
          <span className="micro-label">NOVO CLIENTE</span>
          <h1>Cadastrar cliente</h1>
          <p>
            {designer.role === "DESIGNER"
              ? "O cliente será atribuído automaticamente a você."
              : "Cadastre o cliente e defina o designer responsável."}
          </p>
        </div>
      </header>

      <section className="form-surface narrow-surface">
        <form action={createClient} className="stack-form">
          <label className="field">
            <span>Nome do cliente</span>
            <input
              name="name"
              placeholder="Ex.: Clínica Aurora"
              autoFocus
              required
            />
          </label>

          {designer.role !== "DESIGNER" ? (
            <label className="field">
              <span>Designer responsável</span>
              <select name="assignedDesignerId" defaultValue="">
                <option value="">Sem responsável por enquanto</option>
                {designers.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} — {item.email}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="form-tip">
              Responsável: <strong>{designer.name}</strong>
            </div>
          )}

          <div className="form-actions">
            <Link href="/clients" className="button button-ghost">
              Cancelar
            </Link>
            <button type="submit" className="button button-primary">
              Salvar cliente
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { createClient } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import { getDashboard } from "../../../lib/api";

export default async function NewClientPage() {
  const designer = await requireDesigner();
  const clients = await getDashboard();

  return (
    <AppShell designer={designer} clients={clients}>
      <header className="page-header compact-header">
        <div>
          <Link href="/" className="back-link">
            ← Clientes
          </Link>
          <span className="micro-label">NOVO CLIENTE</span>
          <h1>Cadastrar cliente</h1>
          <p>Comece pelo básico. O calendário vem na próxima etapa.</p>
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

          <div className="form-actions">
            <Link href="/" className="button button-ghost">
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

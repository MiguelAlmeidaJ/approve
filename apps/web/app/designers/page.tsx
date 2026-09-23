import { FiUserPlus } from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { DesignersList } from "../../components/designers-list";
import { createDesigner } from "../actions";
import { requireRole } from "../../lib/auth";
import { getDesigners } from "../../lib/api";

export default async function DesignersPage() {
  const designer = await requireRole("ADMIN", "DEV");
  const designers = await getDesigners();
  const canCreate = designer.role === "ADMIN";

  return (
    <AppShell designer={designer} activeSection="designers">
      <header className="page-header">
        <div>
          <span className="micro-label">EQUIPE</span>
          <h1>Designers</h1>
          <p>
            Designers recebem clientes e ficam responsáveis pelos calendários
            desses clientes.
          </p>
        </div>
      </header>

      <section className="designer-layout">
        <div>
          <div className="section-title-row">
            <h2>Designers cadastrados</h2>
            <span>{designers.length} no total</span>
          </div>

          <DesignersList designers={designers} />
        </div>

        <aside className="form-surface designer-create-panel">
          {canCreate ? (
            <>
              <span className="micro-label">NOVO DESIGNER</span>
              <h2>Criar acesso</h2>
              <p>
                Apenas usuários admin podem criar novos designers.
              </p>

              <form action={createDesigner} className="stack-form">
                <label className="field">
                  <span>Nome</span>
                  <input name="name" required />
                </label>

                <label className="field">
                  <span>E-mail</span>
                  <input type="email" name="email" required />
                </label>

                <label className="field">
                  <span>Senha inicial</span>
                  <input
                    type="password"
                    name="password"
                    minLength={6}
                    required
                  />
                </label>

                <button type="submit" className="button button-primary">
                  <FiUserPlus aria-hidden="true" />
                  Criar designer
                </button>
              </form>
            </>
          ) : (
            <div className="permission-note">
              <span className="micro-label">ACESSO DEV</span>
              <h2>Somente visualização</h2>
              <p>
                A criação de designers está reservada ao perfil admin.
              </p>
            </div>
          )}
        </aside>
      </section>
    </AppShell>
  );
}

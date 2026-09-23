import { AppShell } from "../../components/app-shell";
import { requireRole } from "../../lib/auth";

export default async function ConfigPage() {
  const designer = await requireRole("DEV");

  const settings = [
    {
      label: "Ambiente",
      value: process.env.NODE_ENV ?? "development"
    },
    {
      label: "API Nest",
      value: process.env.API_URL ?? "não configurada"
    },
    {
      label: "Aplicação",
      value: process.env.APP_URL ?? "não configurada"
    },
    {
      label: "Origem web",
      value: process.env.WEB_ORIGIN ?? "não configurada"
    }
  ];

  return (
    <AppShell designer={designer} activeSection="config">
      <header className="page-header">
        <div>
          <span className="micro-label">DEV ONLY</span>
          <h1>Config</h1>
          <p>
            Informações técnicas do ambiente. Segredos não são exibidos nesta
            tela.
          </p>
        </div>
      </header>

      <div className="config-grid">
        {settings.map((setting) => (
          <article className="config-card" key={setting.label}>
            <span>{setting.label}</span>
            <strong>{setting.value}</strong>
          </article>
        ))}
      </div>

      <section className="form-surface config-note">
        <span className="micro-label">PERMISSÕES</span>
        <h2>Perfis internos</h2>
        <div className="permission-matrix">
          <div>
            <strong>dev</strong>
            <span>Acesso geral + Config. Não cria designers.</span>
          </div>
          <div>
            <strong>admin</strong>
            <span>Acesso geral + criação de designers e atribuições.</span>
          </div>
          <div>
            <strong>designer</strong>
            <span>Acessa somente os clientes atribuídos a ele.</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

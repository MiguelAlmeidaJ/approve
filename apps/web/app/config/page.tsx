import { AppShell } from "../../components/app-shell";
import { requireRole } from "../../lib/auth";

export default async function ConfigPage() {
  const designer = await requireRole("DEV");

  const settings = [
    {
      label: "Ambiente",
      value: process.env.NODE_ENV ?? "development",
    },
    {
      label: "API Nest",
      value: process.env.API_URL ?? "não configurada",
    },
    {
      label: "Aplicação",
      value: process.env.APP_URL ?? "não configurada",
    },
    {
      label: "Origem web",
      value: process.env.WEB_ORIGIN ?? "não configurada",
    },
    {
      label: "Nextcloud",
      value: process.env.NEXTCLOUD_URL ?? "não configurado",
    },
    {
      label: "Usuário Nextcloud",
      value: process.env.NEXTCLOUD_USERNAME ?? "não configurado",
    },
    {
      label: "Pasta raiz Nextcloud",
      value: process.env.NEXTCLOUD_ROOT_PATH ?? "/Clientes",
    },
    {
      label: "Credencial Nextcloud",
      value:
        process.env.NEXTCLOUD_APP_PASSWORD &&
        process.env.NEXTCLOUD_USERNAME &&
        process.env.NEXTCLOUD_URL
          ? "configurada"
          : "incompleta",
    },
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
            <span>Acesso geral + Config. Visualiza a equipe.</span>
          </div>
          <div>
            <strong>admin</strong>
            <span>Acesso geral + gestão da equipe e atribuições.</span>
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

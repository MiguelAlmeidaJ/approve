import { redirect } from "next/navigation";
import { Brand } from "../../components/brand";
import { getDesigner } from "../../lib/auth";
import { loginDesigner } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const designer = await getDesigner();

  if (designer) {
    redirect("/");
  }

  const { error } = await searchParams;
  const errorMessage =
    error === "api"
      ? "Não foi possível conectar ao serviço de autenticação. Verifique se a API Nest está rodando e se API_URL aponta para a porta correta."
      : error
        ? "E-mail ou senha inválidos."
        : null;

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-content">
          <Brand tone="dark" />
          <span className="micro-label micro-label-light">
            TERCEIRO ANDAR · APROVAÇÃO
          </span>
          <h1>Calendários claros. Aprovações simples.</h1>
          <p>
            Um espaço direto para organizar o conteúdo de cada cliente e
            compartilhar a prévia do mês.
          </p>
        </div>
        <div className="login-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-panel">
        <form action={loginDesigner} className="login-form">
          <div>
            <span className="micro-label">ÁREA DO DESIGNER</span>
            <h2>Entrar</h2>
            <p>Use seu acesso da Terceiro Andar.</p>
          </div>

          {errorMessage ? (
            <div className="form-error">{errorMessage}</div>
          ) : null}

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              placeholder="designer@terceiroandar.com.br"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="button button-primary button-wide">
            Entrar no painel
          </button>
        </form>
      </section>
    </main>
  );
}

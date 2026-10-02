import Link from "next/link";
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
    redirect(designer.mustChangePassword ? "/nova-senha" : "/");
  }

  const { error } = await searchParams;
  const errorMessage =
    error === "api"
      ? "Não foi possível conectar ao serviço de autenticação. Verifique se a API Nest está rodando e se API_URL aponta para a porta correta."
      : error
        ? "E-mail ou senha inválidos."
        : null;

  return (
    <main className="login-page login-page-simple">
      <section className="login-shell">
        <div className="login-brand">
          <Brand />
        </div>

        <div className="login-intro">
          <span className="micro-label">ÁREA DO DESIGNER</span>
          <h1>Entrar</h1>
          <p>Use seu acesso da Terceiro Andar.</p>
        </div>

        <form action={loginDesigner} className="login-form login-form-simple">
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

          <div className="login-form-help">
            <Link href="/esqueci-senha">Esqueci minha senha</Link>
          </div>

          <button type="submit" className="button button-primary button-wide">
            Entrar no painel
          </button>
        </form>

        <span className="login-footnote">Terceiro Andar · Aprovação de conteúdo</span>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "../../components/brand";
import { PasswordInput } from "../../components/password-input";
import { getDesigner } from "../../lib/auth";
import { loginAccount } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const designer = await getDesigner();

  if (designer) {
    redirect(designer.mustChangePassword ? "/nova-senha" : "/");
  }

  const { error, next } = await searchParams;
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
          <span className="micro-label">ACESSO AO SISTEMA</span>
          <h1>Entrar</h1>
          <p>Entre como equipe ou cliente usando seu e-mail e senha.</p>
        </div>

        <form action={loginAccount} className="login-form login-form-simple">\n          <input type="hidden" name="next" value={next ?? ""} />
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
            <PasswordInput
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

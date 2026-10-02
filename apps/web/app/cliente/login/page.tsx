import { redirect } from "next/navigation";
import { Brand } from "../../../components/brand";
import { PasswordInput } from "../../../components/password-input";
import { getClientAccount } from "../../../lib/client-auth";
import { loginClient } from "./actions";

export default async function ClientLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const current = await getClientAccount();

  if (current) {
    redirect("/cliente");
  }

  const { error, next } = await searchParams;

  return (
    <main className="login-page login-page-simple">
      <section className="login-shell">
        <div className="login-brand">
          <Brand />
        </div>

        <div className="login-intro">
          <span className="micro-label">ACESSO DO CLIENTE</span>
          <h1>Entrar</h1>
          <p>Use o e-mail e a senha fornecidos pela Terceiro Andar.</p>
        </div>

        <form action={loginClient} className="login-form login-form-simple">
          <input type="hidden" name="next" value={next ?? "/cliente"} />

          {error ? (
            <div className="form-error">E-mail ou senha inválidos.</div>
          ) : null}

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              placeholder="cliente@empresa.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              minLength={6}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="button button-primary button-wide">
            Entrar na área do cliente
          </button>
        </form>

        <span className="login-footnote">Terceiro Andar · Aprovação de conteúdo</span>
      </section>
    </main>
  );
}

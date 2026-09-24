import { redirect } from "next/navigation";
import { Brand } from "../../../components/brand";
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
    <main className="client-login-page">
      <section className="client-login-visual">
        <div className="client-login-copy">
          <Brand />
          <span className="micro-label micro-label-light">
            ÁREA DO CLIENTE
          </span>
          <h1>Aprovar ficou simples.</h1>
          <p>
            Acesse seus calendários, revise as peças e concentre todas as
            aprovações em um único lugar.
          </p>
        </div>
      </section>

      <section className="client-login-panel">
        <form action={loginClient} className="client-login-form">
          <input type="hidden" name="next" value={next ?? "/cliente"} />
          <div>
            <span className="micro-label">ACESSO DO CLIENTE</span>
            <h2>Entrar</h2>
            <p>Use o e-mail e a senha fornecidos pela Terceiro Andar.</p>
          </div>

          {error ? (
            <div className="form-error">E-mail ou senha inválidos.</div>
          ) : null}

          <label className="field">
            <span>E-mail</span>
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              minLength={6}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="button button-primary button-wide">
            Entrar na área do cliente
          </button>
        </form>
      </section>
    </main>
  );
}

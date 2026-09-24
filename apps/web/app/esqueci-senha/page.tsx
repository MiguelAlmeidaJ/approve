import Link from "next/link";
import { Brand } from "../../components/brand";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const errorMessage =
    error === "mail"
      ? "Não foi possível enviar o e-mail agora. Verifique a configuração SMTP ou tente novamente."
      : error === "api"
        ? "Não foi possível conectar ao serviço de autenticação."
        : error
          ? "Informe um e-mail válido."
          : null;

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-content">
          <Brand tone="dark" />
          <span className="micro-label micro-label-light">
            TERCEIRO ANDAR · ACESSO
          </span>
          <h1>Recupere seu acesso com segurança.</h1>
          <p>
            Informe seu e-mail e enviaremos uma senha temporária. No próximo
            login você deverá definir uma nova senha forte.
          </p>
        </div>
        <div className="login-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-panel">
        {sent === "1" ? (
          <div className="login-form">
            <div>
              <span className="micro-label">E-MAIL ENVIADO</span>
              <h2>Confira sua caixa de entrada</h2>
              <p>
                Se o e-mail estiver vinculado a um usuário ativo, você receberá
                uma senha temporária para entrar no sistema.
              </p>
            </div>

            <div className="auth-success">
              A senha temporária substitui a senha anterior e exigirá uma nova
              senha no próximo acesso.
            </div>

            <Link href="/login" className="button button-primary button-wide">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="login-form">
            <div>
              <span className="micro-label">RECUPERAR SENHA</span>
              <h2>Esqueci minha senha</h2>
              <p>Digite o e-mail usado para acessar o painel.</p>
            </div>

            {errorMessage ? (
              <div className="form-error">{errorMessage}</div>
            ) : null}

            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                name="email"
                placeholder="nome@terceiroandar.com.br"
                autoComplete="email"
                required
                autoFocus
              />
            </label>

            <button type="submit" className="button button-primary button-wide">
              Enviar senha temporária
            </button>

            <div className="login-form-help login-form-help-center">
              <Link href="/login">Voltar para o login</Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

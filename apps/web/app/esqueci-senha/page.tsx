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
    <main className="login-page login-page-simple">
      <section className="login-shell">
        <div className="login-brand">
          <Brand />
        </div>

        {sent === "1" ? (
          <>
            <div className="login-intro">
              <span className="micro-label">E-MAIL ENVIADO</span>
              <h1>Confira seu e-mail</h1>
              <p>
                Se o endereço estiver vinculado a um usuário ativo, enviaremos
                uma senha temporária para acesso.
              </p>
            </div>

            <div className="auth-success">
              A senha temporária substitui a anterior e será necessário definir
              uma nova senha no próximo login.
            </div>

            <Link href="/login" className="button button-primary button-wide">
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            <div className="login-intro">
              <span className="micro-label">RECUPERAR SENHA</span>
              <h1>Esqueci minha senha</h1>
              <p>Digite o e-mail usado para acessar o painel.</p>
            </div>

            <form action={requestPasswordReset} className="login-form login-form-simple">
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
          </>
        )}

        <span className="login-footnote">Terceiro Andar · Aprovação de conteúdo</span>
      </section>
    </main>
  );
}

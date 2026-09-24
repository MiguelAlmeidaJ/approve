import { redirect } from "next/navigation";
import { Brand } from "../../components/brand";
import { PasswordChangeForm } from "../../components/password-change-form";
import { getDesigner } from "../../lib/auth";

export default async function NewPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const designer = await getDesigner();

  if (!designer) {
    redirect("/login");
  }

  if (!designer.mustChangePassword) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-content">
          <Brand tone="dark" />
          <span className="micro-label micro-label-light">
            TERCEIRO ANDAR · SEGURANÇA
          </span>
          <h1>Proteja seu acesso.</h1>
          <p>
            Olá, {designer.name}. Antes de continuar, defina uma senha pessoal
            que atenda aos requisitos de segurança.
          </p>
        </div>
        <div className="login-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-panel">
        <PasswordChangeForm error={error} />
      </section>
    </main>
  );
}

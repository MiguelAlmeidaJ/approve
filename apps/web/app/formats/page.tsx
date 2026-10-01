import { AppShell } from "../../components/app-shell";
import { FormatManager } from "../../components/format-manager";
import { requireRole } from "../../lib/auth";
import { getFormats } from "../../lib/api";

export default async function FormatsPage() {
  const designer = await requireRole("ADMIN", "DEV");
  const formats = await getFormats();

  return (
    <AppShell designer={designer} activeSection="formats">
      <header className="page-header">
        <div>
          <span className="micro-label">FORMATOS</span>
          <h1>Formatos</h1>
          <p>
            Padronize dimensões e compatibilidades para acelerar o cadastro das
            peças nos calendários.
          </p>
        </div>
      </header>

      <FormatManager formats={formats} />
    </AppShell>
  );
}

import { AppShell } from "../../components/app-shell";
import { SystemBrandingEditor } from "../../components/system-branding-editor";
import { requireRole } from "../../lib/auth";
import { getSystemBranding } from "../../lib/api";

export default async function VisualIdentityPage() {
  const designer = await requireRole("ADMIN", "DEV");
  const branding = await getSystemBranding();

  return (
    <AppShell designer={designer} activeSection="identity">
      <header className="page-header">
        <div>
          <span className="micro-label">SISTEMA</span>
          <h1>Identidade visual</h1>
          <p>
            Defina a logo e o favicon usados pelo sistema. Os arquivos podem
            ser selecionados diretamente do Nextcloud.
          </p>
        </div>
      </header>

      <SystemBrandingEditor branding={branding} />
    </AppShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../../components/app-shell";
import { createCalendar } from "../../../../actions";
import { requireDesigner } from "../../../../../lib/auth";
import {
  getClient,
  getDashboard
} from "../../../../../lib/api";

export default async function NewCalendarPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [designer, clients, client] = await Promise.all([
    requireDesigner(),
    getDashboard(),
    getClient(clientId)
  ]);

  if (!client) {
    notFound();
  }

  return (
    <AppShell
      designer={designer}
      clients={clients}
      activeClientId={client.id}
    >
      <header className="page-header compact-header">
        <div>
          <Link href={`/clients/${client.id}`} className="back-link">
            ← {client.name}
          </Link>
          <span className="micro-label">NOVO CALENDÁRIO</span>
          <h1>Criar calendário</h1>
          <p>
            Escolha o mês. O título pode ficar vazio para ser gerado
            automaticamente.
          </p>
        </div>
      </header>

      <section className="form-surface narrow-surface">
        <form action={createCalendar} className="stack-form">
          <input type="hidden" name="clientId" value={client.id} />

          <label className="field">
            <span>Mês de referência</span>
            <input type="month" name="month" required autoFocus />
          </label>

          <label className="field">
            <span>Título do calendário</span>
            <input
              name="title"
              placeholder="Ex.: Campanha de Outubro (opcional)"
            />
          </label>

          <div className="form-tip">
            O link de aprovação do cliente será criado automaticamente.
          </div>

          <div className="form-actions">
            <Link
              href={`/clients/${client.id}`}
              className="button button-ghost"
            >
              Cancelar
            </Link>
            <button type="submit" className="button button-primary">
              Criar calendário
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

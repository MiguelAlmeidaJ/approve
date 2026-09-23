import Link from "next/link";
import { logoutDesigner } from "../app/actions";
import type { Client, Designer } from "../lib/api";
import { Brand } from "./brand";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  designer,
  clients,
  activeClientId,
  children
}: {
  designer: Designer;
  clients: Client[];
  activeClientId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
          <span>aprovação</span>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <Link
            href="/"
            className={!activeClientId ? "nav-link active" : "nav-link"}
          >
            <span className="nav-dot" />
            Visão geral
          </Link>

          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Clientes</span>
              <Link href="/clients/new" aria-label="Cadastrar cliente">
                +
              </Link>
            </div>

            <div className="client-nav-list">
              {clients.length === 0 ? (
                <p className="sidebar-empty">Nenhum cliente ainda.</p>
              ) : (
                clients.map((client) => (
                  <Link
                    href={`/clients/${client.id}`}
                    key={client.id}
                    className={
                      client.id === activeClientId
                        ? "client-nav-link active"
                        : "client-nav-link"
                    }
                  >
                    <span className="client-avatar">
                      {initials(client.name) || "C"}
                    </span>
                    <span>{client.name}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="designer-avatar">
            {initials(designer.name) || "TA"}
          </div>
          <div className="designer-meta">
            <strong>{designer.name}</strong>
            <span>{designer.email}</span>
          </div>
          <form action={logoutDesigner}>
            <button
              type="submit"
              className="icon-button"
              aria-label="Sair"
              title="Sair"
            >
              ↗
            </button>
          </form>
        </div>
      </aside>

      <main className="workspace">{children}</main>
    </div>
  );
}

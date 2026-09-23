import Link from "next/link";
import {
  FiBriefcase,
  FiLayers,
  FiPlus,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { UsersList } from "../../components/users-list";
import { createUser, updateUser } from "../actions";
import { requireRole } from "../../lib/auth";
import { getUsers } from "../../lib/api";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const currentUser = await requireRole("ADMIN", "DEV");
  const users = await getUsers();
  const { edit } = await searchParams;
  const canManage = currentUser.role === "ADMIN";
  const selectedUser = canManage
    ? users.find((user) => user.id === edit)
    : undefined;
  const designers = users.filter((user) => user.role === "DESIGNER").length;
  const leadership = users.length - designers;
  const assignedClients = users.reduce(
    (total, user) => total + user._count.clients,
    0,
  );

  return (
    <AppShell designer={currentUser} activeSection="team">
      <header className="team-page-header">
        <div>
          <span className="micro-label">PESSOAS & ACESSOS</span>
          <h1>Equipe</h1>
          <p>
            Organize acessos, responsabilidades e a distribuição da operação.
          </p>
        </div>

        {canManage ? (
          <a href="#adicionar-equipe" className="button button-primary">
            <FiPlus aria-hidden="true" />
            Adicionar à equipe
          </a>
        ) : (
          <div className="team-view-badge">
            <FiShield aria-hidden="true" />
            <div>
              <span>Modo de consulta</span>
              <strong>Visão completa da equipe</strong>
            </div>
          </div>
        )}
      </header>

      <section className="team-overview" aria-label="Resumo da equipe">
        <article>
          <div className="team-stat-icon team-stat-icon-pink">
            <FiUsers aria-hidden="true" />
          </div>
          <div>
            <span>Pessoas na equipe</span>
            <strong>{users.length}</strong>
          </div>
          <small>Acessos ativos</small>
        </article>
        <article>
          <div className="team-stat-icon">
            <FiLayers aria-hidden="true" />
          </div>
          <div>
            <span>Designers</span>
            <strong>{designers}</strong>
          </div>
          <small>Na operação criativa</small>
        </article>
        <article>
          <div className="team-stat-icon">
            <FiShield aria-hidden="true" />
          </div>
          <div>
            <span>Gestão & tecnologia</span>
            <strong>{leadership}</strong>
          </div>
          <small>Admin e desenvolvimento</small>
        </article>
        <article>
          <div className="team-stat-icon">
            <FiBriefcase aria-hidden="true" />
          </div>
          <div>
            <span>Clientes atribuídos</span>
            <strong>{assignedClients}</strong>
          </div>
          <small>Responsabilidades ativas</small>
        </article>
      </section>

      <section
        className={
          canManage
            ? "team-management-layout"
            : "team-management-layout is-readonly"
        }
      >
        <div className="team-directory">
          <div className="team-section-heading">
            <div>
              <span className="micro-label">DIRETÓRIO</span>
              <h2>Pessoas da equipe</h2>
              <p>Encontre rapidamente um membro, perfil ou responsabilidade.</p>
            </div>
            <span className="team-total-pill">{users.length} pessoas</span>
          </div>

          <UsersList users={users} canManage={canManage} />
        </div>

        {canManage ? (
          <aside
            className="form-surface team-create-panel"
            id="adicionar-equipe"
          >
            <div className="panel-icon">
              <FiUserPlus aria-hidden="true" />
            </div>
            <span className="micro-label">NOVO ACESSO</span>
            <h2>Adicionar à equipe</h2>
            <p>Defina os dados de entrada e o nível de acesso inicial.</p>

            <form action={createUser} className="stack-form">
              <label className="field">
                <span>Nome completo</span>
                <input
                  name="name"
                  placeholder="Nome da pessoa"
                  minLength={2}
                  required
                />
              </label>
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  name="email"
                  placeholder="nome@empresa.com"
                  required
                />
              </label>
              <label className="field">
                <span>Perfil de acesso</span>
                <select name="role" defaultValue="DESIGNER" required>
                  <option value="DESIGNER">Designer</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="DEV">Desenvolvedor</option>
                </select>
              </label>
              <label className="field">
                <span>Senha inicial</span>
                <input
                  type="password"
                  name="password"
                  minLength={6}
                  placeholder="Mínimo de 6 caracteres"
                  required
                />
              </label>
              <button
                type="submit"
                className="button button-primary button-wide"
              >
                <FiUserPlus aria-hidden="true" />
                Adicionar à equipe
              </button>
            </form>
          </aside>
        ) : null}
      </section>

      {selectedUser ? (
        <div className="modal-layer">
          <Link
            href="/equipe"
            className="modal-backdrop"
            aria-label="Fechar edição"
            scroll={false}
          />
          <section
            className="user-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-team-member-title"
          >
            <div className="user-edit-heading">
              <div>
                <span className="micro-label">EDITAR MEMBRO</span>
                <h2 id="edit-team-member-title">{selectedUser.name}</h2>
                <p>Atualize o perfil ou redefina a senha de acesso.</p>
              </div>
              <Link
                href="/equipe"
                className="modal-close"
                aria-label="Fechar"
                scroll={false}
              >
                <FiX aria-hidden="true" />
              </Link>
            </div>

            <form action={updateUser} className="user-edit-form">
              <input type="hidden" name="userId" value={selectedUser.id} />
              <label className="field">
                <span>Nome completo</span>
                <input
                  name="name"
                  defaultValue={selectedUser.name}
                  minLength={2}
                  required
                  autoFocus
                />
              </label>
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  name="email"
                  defaultValue={selectedUser.email}
                  required
                />
              </label>
              <label className="field">
                <span>Perfil de acesso</span>
                <select name="role" defaultValue={selectedUser.role} required>
                  <option value="DESIGNER">Designer</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="DEV">Desenvolvedor</option>
                </select>
              </label>
              <label className="field">
                <span>
                  Nova senha <small>(opcional)</small>
                </span>
                <input
                  type="password"
                  name="password"
                  minLength={6}
                  placeholder="Mantenha vazio para não alterar"
                />
              </label>
              {selectedUser._count.clients > 0 ? (
                <p className="edit-warning">
                  Esta pessoa possui {selectedUser._count.clients} cliente(s).
                  Reatribua-os antes de trocar o perfil de designer.
                </p>
              ) : null}
              <div className="form-actions">
                <Link
                  href="/equipe"
                  className="button button-ghost"
                  scroll={false}
                >
                  Cancelar
                </Link>
                <button type="submit" className="button button-primary">
                  Salvar alterações
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

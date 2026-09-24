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
import { getUsers, type UserListItem } from "../../lib/api";

function canEditUser(
  currentRole: "DEV" | "ADMIN",
  user: UserListItem,
) {
  return currentRole === "DEV" || user.role === "DESIGNER";
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; create?: string }>;
}) {
  const currentUser = await requireRole("ADMIN", "DEV");
  const users = await getUsers();
  const { edit, create } = await searchParams;
  const currentRole = currentUser.role as "DEV" | "ADMIN";
  const isDev = currentRole === "DEV";
  const selectedUser = users.find(
    (user) => user.id === edit && canEditUser(currentRole, user),
  );
  const showCreateModal = create === "1" && !selectedUser;
  const designers = users.filter((user) => user.role === "DESIGNER").length;
  const leadership = users.filter((user) => user.role !== "DESIGNER").length;
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

        <Link
          href="/equipe?create=1"
          className="button button-primary"
          scroll={false}
        >
          <FiPlus aria-hidden="true" />
          Adicionar à equipe
        </Link>
      </header>

      <section className="team-permission-banner">
        <FiShield aria-hidden="true" />
        <div>
          <span>{isDev ? "GESTÃO COMPLETA" : "GESTÃO DE DESIGNERS"}</span>
          <strong>
            {isDev
              ? "Você pode gerenciar devs, admins e designers."
              : "Você pode criar e editar designers. Contas dev ficam ocultas."}
          </strong>
        </div>
      </section>

      <section className="team-overview" aria-label="Resumo da equipe">
        <article>
          <div className="team-stat-icon team-stat-icon-pink">
            <FiUsers aria-hidden="true" />
          </div>
          <div>
            <span>Pessoas visíveis</span>
            <strong>{users.length}</strong>
          </div>
          <small>Acessos disponíveis para seu perfil</small>
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
          <small>{isDev ? "Admins e desenvolvimento" : "Administradores"}</small>
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

      <section className="team-management-layout team-management-single">
        <div className="team-directory">
          <div className="team-section-heading">
            <div>
              <span className="micro-label">DIRETÓRIO</span>
              <h2>Pessoas da equipe</h2>
              <p>Encontre rapidamente um membro, perfil ou responsabilidade.</p>
            </div>
            <span className="team-total-pill">{users.length} pessoas</span>
          </div>

          <UsersList users={users} currentRole={currentRole} />
        </div>
      </section>

      {showCreateModal ? (
        <div className="modal-layer">
          <Link
            href="/equipe"
            className="modal-backdrop"
            aria-label="Fechar criação de usuário"
            scroll={false}
          />
          <section
            className="user-edit-modal team-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-team-member-title"
          >
            <div className="user-edit-heading">
              <div>
                <span className="micro-label">NOVO ACESSO</span>
                <h2 id="create-team-member-title">Adicionar à equipe</h2>
                <p>
                  {isDev
                    ? "Crie designers, administradores ou outra conta dev."
                    : "Administradores podem criar apenas novos designers."}
                </p>
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

            <form action={createUser} className="user-edit-form team-create-form">
              <label className="field">
                <span>Nome completo</span>
                <input
                  name="name"
                  placeholder="Nome da pessoa"
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
                  placeholder="nome@empresa.com"
                  required
                />
              </label>

              <label className="field">
                <span>Perfil de acesso</span>
                <select name="role" defaultValue="DESIGNER" required>
                  <option value="DESIGNER">Designer</option>
                  {isDev ? (
                    <>
                      <option value="ADMIN">Administrador</option>
                      <option value="DEV">Desenvolvedor</option>
                    </>
                  ) : null}
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

              <div className="team-access-note team-create-note">
                <FiShield aria-hidden="true" />
                <span>
                  {isDev
                    ? "Contas dev têm acesso total. Administradores gerenciam designers."
                    : "A criação de administradores e devs é exclusiva de usuários dev."}
                </span>
              </div>

              <div className="form-actions">
                <Link
                  href="/equipe"
                  className="button button-ghost"
                  scroll={false}
                >
                  Cancelar
                </Link>
                <button type="submit" className="button button-primary">
                  <FiUserPlus aria-hidden="true" />
                  Adicionar à equipe
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

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
                <p>Atualize dados, perfil ou redefina a senha de acesso.</p>
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
                  {isDev ? (
                    <>
                      <option value="ADMIN">Administrador</option>
                      <option value="DEV">Desenvolvedor</option>
                    </>
                  ) : null}
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

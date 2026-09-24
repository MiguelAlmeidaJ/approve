import Link from "next/link";
import {
  FiAtSign,
  FiBriefcase,
  FiFolder,
  FiKey,
  FiLock,
  FiPhone,
  FiShield,
  FiUser,
  FiUserCheck
} from "react-icons/fi";
import type { Client, DesignerListItem } from "../lib/api";

export function ClientForm({
  action,
  designers,
  currentDesignerName,
  client,
  cancelHref
}: {
  action: (formData: FormData) => void | Promise<void>;
  designers: DesignerListItem[];
  currentDesignerName: string;
  client?: Client;
  cancelHref: string;
}) {
  const isEditing = Boolean(client);

  return (
    <div className="client-editor-layout">
      <form action={action} className="client-editor-form">
        {client ? (
          <input type="hidden" name="clientId" value={client.id} />
        ) : null}

        <section className="client-form-section">
          <div className="client-form-section-head">
            <span className="client-form-icon">
              <FiBriefcase aria-hidden="true" />
            </span>
            <div>
              <strong>Informações da empresa</strong>
              <small>Dados que ajudam a identificar e organizar a conta.</small>
            </div>
          </div>

          <div className="client-form-grid">
            <label className="field field-span-2">
              <span>Nome do cliente</span>
              <div className="input-with-icon">
                <FiUser aria-hidden="true" />
                <input
                  name="name"
                  defaultValue={client?.name ?? ""}
                  placeholder="Ex.: Clínica Aurora"
                  autoFocus={!isEditing}
                  required
                />
              </div>
            </label>

            <label className="field field-span-2">
              <span>Nicho / segmento</span>
              <div className="input-with-icon">
                <FiBriefcase aria-hidden="true" />
                <input
                  name="niche"
                  defaultValue={client?.niche ?? ""}
                  placeholder="Ex.: Saúde, gastronomia, imobiliário..."
                  required
                />
              </div>
            </label>

            <label className="field field-span-2">
              <span>Telefone de contato</span>
              <div className="input-with-icon">
                <FiPhone aria-hidden="true" />
                <input
                  name="phone"
                  type="tel"
                  defaultValue={client?.phone ?? ""}
                  placeholder="(22) 99999-9999"
                  required
                />
              </div>
            </label>

            <label className="field field-span-2">
              <span>Pasta do cliente no Nextcloud</span>
              <div className="input-with-icon">
                <FiFolder aria-hidden="true" />
                <input
                  name="nextcloudPath"
                  defaultValue={client?.nextcloudPath ?? ""}
                  placeholder="Ex.: /CLIENTE ACME"
                />
              </div>
              <small className="field-helper">
                Caminho relativo a NEXTCLOUD_ROOT_PATH. Se ficar vazio, usamos
                /{client?.slug || "slug-do-cliente"}. Use / apenas se este
                cliente realmente puder acessar toda a pasta raiz configurada.
              </small>
            </label>
          </div>
        </section>

        <section className="client-form-section">
          <div className="client-form-section-head">
            <span className="client-form-icon pink">
              <FiLock aria-hidden="true" />
            </span>
            <div>
              <strong>Acesso do cliente</strong>
              <small>
                E-mail e senha usados para entrar na área de aprovação.
              </small>
            </div>
          </div>

          <div className="client-form-grid">
            <label className="field">
              <span>E-mail de acesso</span>
              <div className="input-with-icon">
                <FiAtSign aria-hidden="true" />
                <input
                  name="email"
                  type="email"
                  defaultValue={client?.credential?.email ?? ""}
                  placeholder="cliente@empresa.com"
                  autoComplete="off"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>
                {isEditing ? "Nova senha" : "Senha inicial"}
              </span>
              <div className="input-with-icon">
                <FiKey aria-hidden="true" />
                <input
                  name="password"
                  type="password"
                  placeholder={
                    isEditing
                      ? "Deixe vazio para manter a atual"
                      : "Mínimo de 6 caracteres"
                  }
                  minLength={6}
                  required={!isEditing || !client?.credential}
                  autoComplete="new-password"
                />
              </div>
              {isEditing ? (
                <small className="field-helper">
                  Preencha apenas se quiser redefinir a senha do cliente.
                </small>
              ) : null}
            </label>
          </div>
        </section>

        <section className="client-form-section">
          <div className="client-form-section-head">
            <span className="client-form-icon">
              <FiUserCheck aria-hidden="true" />
            </span>
            <div>
              <strong>Responsável interno</strong>
              <small>Designer que cuidará dos calendários deste cliente.</small>
            </div>
          </div>

          {designers.length > 0 ? (
            <label className="field">
              <span>Designer responsável</span>
              <select
                name="assignedDesignerId"
                defaultValue={client?.assignedDesignerId ?? ""}
              >
                <option value="">Sem responsável por enquanto</option>
                {designers.map((designer) => (
                  <option value={designer.id} key={designer.id}>
                    {designer.name} — {designer.email}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="client-assignment-locked">
              <FiUserCheck aria-hidden="true" />
              <span>
                Responsável
                <strong>{currentDesignerName}</strong>
              </span>
            </div>
          )}
        </section>

        <div className="client-editor-actions">
          <Link href={cancelHref} className="button button-ghost">
            Cancelar
          </Link>
          <button type="submit" className="button button-primary">
            {isEditing ? "Salvar alterações" : "Criar cliente"}
          </button>
        </div>
      </form>

      <aside className="client-access-preview">
        <div className="client-access-preview-mark">
          <FiShield aria-hidden="true" />
        </div>
        <span className="micro-label micro-label-light">ACESSO DO CLIENTE</span>
        <h2>
          Um login.
          <br />
          Todos os calendários.
        </h2>
        <p>
          O cliente usará o e-mail e a senha cadastrados para acessar sua área
          e acompanhar as aprovações.
        </p>

        <div className="client-access-flow">
          <div>
            <span>01</span>
            <strong>Login protegido</strong>
            <small>Senha salva somente como hash.</small>
          </div>
          <div>
            <span>02</span>
            <strong>Calendários da conta</strong>
            <small>O acesso fica vinculado a este cliente.</small>
          </div>
          <div>
            <span>03</span>
            <strong>Aprovação centralizada</strong>
            <small>Sem depender de links espalhados.</small>
          </div>
        </div>
      </aside>
    </div>
  );
}

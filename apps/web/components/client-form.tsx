import Link from "next/link";
import {
  FiAtSign,
  FiBarChart2,
  FiClock,
  FiBriefcase,
  FiCompass,
  FiFolder,
  FiHash,
  FiImage,
  FiKey,
  FiLock,
  FiMessageSquare,
  FiPhone,
  FiRepeat,
  FiShield,
  FiUser,
  FiUserCheck
} from "react-icons/fi";
import type { Client, DesignerListItem } from "../lib/api";
import { ClientLogoField } from "./client-logo-field";
import { PhoneInput } from "./phone-input";
import { ClientNextcloudFolderPicker } from "./client-nextcloud-folder-picker";

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
  const selectedPostingWeekdays = new Set(
    client?.postingWeekdays?.map((item) => item.weekday) ?? [1, 3, 5]
  );
  const weekdays = [
    { value: 1, label: "Seg", full: "Segunda" },
    { value: 2, label: "Ter", full: "Terça" },
    { value: 3, label: "Qua", full: "Quarta" },
    { value: 4, label: "Qui", full: "Quinta" },
    { value: 5, label: "Sex", full: "Sexta" },
    { value: 6, label: "Sáb", full: "Sábado" },
    { value: 0, label: "Dom", full: "Domingo" }
  ];

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
                <PhoneInput
                  name="phone"
                  defaultValue={client?.phone ?? ""}
                  placeholder="(22) 99999-9999"
                  required
                />
              </div>
            </label>

            <div className="field field-span-2">
              <span>Pasta do cliente no Nextcloud</span>
              <ClientNextcloudFolderPicker
                initialPath={client?.nextcloudPath ?? ""}
                suggestedName={client?.name ?? ""}
              />
            </div>
          </div>
        </section>

        <section className="client-form-section client-logo-section" id="client-logo">
          <div className="client-form-section-head">
            <span className="client-form-icon pink">
              <FiImage aria-hidden="true" />
            </span>
            <div>
              <strong>Marca do cliente</strong>
              <small>
                Logo exibida na apresentação comercial e nas aprovações.
              </small>
            </div>
          </div>

          {client ? (
            <ClientLogoField
              clientId={client.id}
              initialPath={client.logoPath}
              initialName={client.logoName}
            />
          ) : (
            <div className="client-logo-pending">
              <FiImage aria-hidden="true" />
              <div>
                <strong>A logo entra no próximo passo</strong>
                <span>
                  Salve o cadastro para criarmos o acesso seguro à pasta do
                  cliente no Nextcloud. Em seguida, você poderá selecionar ou
                  enviar a imagem.
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="client-form-section client-posting-rhythm-section">
          <div className="client-form-section-head">
            <span className="client-form-icon">
              <FiRepeat aria-hidden="true" />
            </span>
            <div>
              <strong>Dias de publicação</strong>
              <small>
                Padrão semanal usado para preencher novos calendários deste cliente.
              </small>
            </div>
          </div>

          <div className="client-weekday-selector" role="group" aria-label="Dias de publicação">
            {weekdays.map((weekday) => (
              <label className="client-weekday-option" key={weekday.value}>
                <input
                  type="checkbox"
                  name="postingWeekday"
                  value={weekday.value}
                  defaultChecked={selectedPostingWeekdays.has(weekday.value)}
                />
                <span>
                  <strong>{weekday.label}</strong>
                  <small>{weekday.full}</small>
                </span>
              </label>
            ))}
          </div>

          <p className="client-rhythm-help">
            Ao criar um calendário, esses dias já virão selecionados. Ainda será
            possível ajustar datas específicas em cada mês.
          </p>
        </section>

        <section className="client-form-section client-strategy-section">
          <div className="client-form-section-head">
            <span className="client-form-icon">
              <FiCompass aria-hidden="true" />
            </span>
            <div>
              <strong>Estratégia do cliente</strong>
              <small>
                Contexto permanente para briefings, calendário e produção.
              </small>
            </div>
          </div>

          <div className="client-form-grid client-strategy-grid">
            <label className="field">
              <span>Região / praça</span>
              <input
                name="region"
                defaultValue={client?.region ?? ""}
                placeholder="Ex.: Cabo Frio e Região dos Lagos"
              />
            </label>

            <label className="field field-span-2">
              <span>Público-alvo</span>
              <textarea
                name="targetAudience"
                rows={3}
                defaultValue={client?.targetAudience ?? ""}
                placeholder="Quem queremos atingir, dores, contexto e comportamento..."
              />
            </label>

            <label className="field field-span-2">
              <span>Tom de voz</span>
              <textarea
                name="toneOfVoice"
                rows={3}
                defaultValue={client?.toneOfVoice ?? ""}
                placeholder="Ex.: próximo, simples, técnico sem ser frio, evitar formalidade..."
              />
            </label>

            <label className="field field-span-2">
              <span>Serviços / produtos prioritários</span>
              <textarea
                name="services"
                rows={3}
                defaultValue={client?.services ?? ""}
                placeholder="Liste os serviços, produtos ou categorias que precisam aparecer com frequência."
              />
            </label>

            <label className="field field-span-2">
              <span>Objetivos de comunicação</span>
              <textarea
                name="objectives"
                rows={3}
                defaultValue={client?.objectives ?? ""}
                placeholder="Ex.: gerar autoridade, aumentar procura, educar clientes, divulgar lançamentos..."
              />
            </label>

            <label className="field">
              <span>
                <FiHash aria-hidden="true" />
                Hashtags / termos recorrentes
              </span>
              <textarea
                name="hashtags"
                rows={3}
                defaultValue={client?.hashtags ?? ""}
                placeholder="#cliente #segmento..."
              />
            </label>

            <label className="field">
              <span>
                <FiMessageSquare aria-hidden="true" />
                Palavras / temas a evitar
              </span>
              <textarea
                name="prohibitedTerms"
                rows={3}
                defaultValue={client?.prohibitedTerms ?? ""}
                placeholder="Termos proibidos, promessas que não podem ser feitas..."
              />
            </label>

            <label className="field field-span-2">
              <span>Referências e concorrentes</span>
              <textarea
                name="references"
                rows={3}
                defaultValue={client?.references ?? ""}
                placeholder="Perfis de referência, concorrentes, links e observações estratégicas..."
              />
            </label>
          </div>
        </section>

        <section className="client-form-section client-contract-section">
          <div className="client-form-section-head">
            <span className="client-form-icon">
              <FiBarChart2 aria-hidden="true" />
            </span>
            <div>
              <strong>Contrato e SLA</strong>
              <small>
                Limites mensais e prazos padrão usados pela operação.
              </small>
            </div>
          </div>

          <div className="client-contract-grid">
            <label className="field">
              <span>Posts / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyPostLimit"
                defaultValue={client?.monthlyPostLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
            <label className="field">
              <span>Carrosséis / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyCarouselLimit"
                defaultValue={client?.monthlyCarouselLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
            <label className="field">
              <span>Reels / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyReelLimit"
                defaultValue={client?.monthlyReelLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
            <label className="field">
              <span>Stories / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyStoryLimit"
                defaultValue={client?.monthlyStoryLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
            <label className="field">
              <span>Artes avulsas / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyStandaloneLimit"
                defaultValue={client?.monthlyStandaloneLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
            <label className="field">
              <span>Pontos / mês</span>
              <input
                type="number"
                min="0"
                name="monthlyPointsLimit"
                defaultValue={client?.monthlyPointsLimit ?? ""}
                placeholder="Sem limite"
              />
            </label>
          </div>

          <div className="client-sla-grid">
            <label className="field">
              <span><FiClock aria-hidden="true" /> SLA para arte do calendário</span>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="1"
                  max="720"
                  name="defaultArtworkSlaHours"
                  defaultValue={client?.defaultArtworkSlaHours ?? 72}
                  required
                />
                <span>horas</span>
              </div>
            </label>
            <label className="field">
              <span><FiClock aria-hidden="true" /> SLA para arte avulsa</span>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="1"
                  max="720"
                  name="defaultStandaloneSlaHours"
                  defaultValue={client?.defaultStandaloneSlaHours ?? 48}
                  required
                />
                <span>horas</span>
              </div>
            </label>
          </div>

          <p className="client-rhythm-help">
            Campos de limite vazios significam sem franquia definida. Quando a
            arte avulsa não tiver prazo manual, o SLA acima define o vencimento
            automaticamente.
          </p>
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

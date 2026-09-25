import Link from "next/link";
import {
  FiCalendar,
  FiEdit3,
  FiMapPin,
  FiPlus,
  FiStar,
  FiX
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import {
  createCommemorativeDate,
  toggleCommemorativeDate,
  updateCommemorativeDate
} from "../actions";
import { requireDesigner } from "../../lib/auth";
import {
  getAccessibleClients,
  getCommemorativeDates,
  type CommemorativeDate
} from "../../lib/api";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

function dateLabel(date: CommemorativeDate) {
  const base = `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}`;
  return date.year ? `${base}/${date.year}` : base;
}

function scopeLabel(date: CommemorativeDate) {
  if (date.scope === "NATIONAL") {
    return "Nacional";
  }

  if (date.client) {
    return date.client.name;
  }

  if (date.city) {
    return [date.city, date.state].filter(Boolean).join(" · ");
  }

  return "Todos os clientes";
}

function DateForm({
  date,
  clients
}: {
  date?: CommemorativeDate;
  clients: Array<{ id: string; name: string }>;
}) {
  const editing = Boolean(date);

  return (
    <form
      action={editing ? updateCommemorativeDate : createCommemorativeDate}
      className="commemorative-form"
    >
      {date ? <input type="hidden" name="id" value={date.id} /> : null}

      <div className="commemorative-form-grid">
        <label className="field field-span-2">
          <span>Nome da data</span>
          <input
            name="name"
            defaultValue={date?.name ?? ""}
            placeholder="Ex.: Aniversário de Cabo Frio"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Dia</span>
          <input
            type="number"
            name="day"
            min={1}
            max={31}
            defaultValue={date?.day ?? ""}
            required
          />
        </label>

        <label className="field">
          <span>Mês</span>
          <select name="month" defaultValue={date?.month ?? 1} required>
            {monthNames.map((month, index) => (
              <option value={index + 1} key={month}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Ano específico</span>
          <input
            type="number"
            name="year"
            min={2000}
            max={2100}
            defaultValue={date?.year ?? ""}
            placeholder="Repete todo ano"
          />
        </label>

        <label className="field">
          <span>Cliente relacionado</span>
          <select name="clientId" defaultValue={date?.clientId ?? ""}>
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Cidade</span>
          <input
            name="city"
            defaultValue={date?.city ?? ""}
            placeholder="Ex.: Cabo Frio"
          />
        </label>

        <label className="field">
          <span>UF</span>
          <input
            name="state"
            defaultValue={date?.state ?? ""}
            maxLength={2}
            placeholder="RJ"
          />
        </label>

        <label className="field field-span-2">
          <span>Tags de nicho / região</span>
          <input
            name="tags"
            defaultValue={date?.tags ?? ""}
            placeholder="Ex.: veterinária, pet, saúde animal, Cabo Frio"
          />
          <small className="field-helper">
            O gerador automático usa essas tags para priorizar a data para clientes relacionados.
          </small>
        </label>

        <label className="field field-span-2">
          <span>Observação / oportunidade de pauta</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={date?.description ?? ""}
            placeholder="Ex.: Boa oportunidade para conteúdo institucional sobre a cidade."
          />
        </label>

        {editing ? (
          <label className="commemorative-active-toggle field-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={date?.active ?? true}
            />
            <span>
              <strong>Data ativa</strong>
              <small>Datas inativas deixam de aparecer nos calendários.</small>
            </span>
          </label>
        ) : null}
      </div>

      <div className="form-actions">
        <Link href="/datas-comemorativas" className="button button-ghost">
          Cancelar
        </Link>
        <button type="submit" className="button button-primary">
          {editing ? "Salvar alterações" : "Cadastrar data"}
        </button>
      </div>
    </form>
  );
}

export default async function CommemorativeDatesPage({
  searchParams
}: {
  searchParams: Promise<{ create?: string; edit?: string }>;
}) {
  const designer = await requireDesigner();
  const [dates, clients] = await Promise.all([
    getCommemorativeDates(),
    getAccessibleClients(designer)
  ]);
  const { create, edit } = await searchParams;
  const canManage = designer.role === "ADMIN" || designer.role === "DEV";
  const national = dates.filter((date) => date.scope === "NATIONAL");
  const custom = dates.filter((date) => date.scope === "CUSTOM");
  const editingDate = canManage
    ? custom.find((date) => date.id === edit)
    : undefined;
  const showModal = canManage && (create === "1" || Boolean(editingDate));

  return (
    <AppShell designer={designer} activeSection="dates">
      <header className="page-header commemorative-page-header">
        <div>
          <span className="micro-label">PLANEJAMENTO EDITORIAL</span>
          <h1>Datas comemorativas</h1>
          <p>
            Enxergue oportunidades de pauta antes de montar o calendário de
            cada cliente.
          </p>
        </div>

        {canManage ? (
          <Link
            href="/datas-comemorativas?create=1"
            className="button button-primary"
            scroll={false}
          >
            <FiPlus aria-hidden="true" />
            Nova data
          </Link>
        ) : null}
      </header>

      <section className="commemorative-summary">
        <article>
          <span className="commemorative-summary-icon">
            <FiCalendar aria-hidden="true" />
          </span>
          <div>
            <small>Datas nacionais</small>
            <strong>{national.filter((date) => date.active).length}</strong>
          </div>
        </article>
        <article>
          <span className="commemorative-summary-icon">
            <FiStar aria-hidden="true" />
          </span>
          <div>
            <small>Datas personalizadas</small>
            <strong>{custom.filter((date) => date.active).length}</strong>
          </div>
        </article>
        <article>
          <span className="commemorative-summary-icon">
            <FiMapPin aria-hidden="true" />
          </span>
          <div>
            <small>Locais / clientes</small>
            <strong>
              {
                custom.filter(
                  (date) => date.active && (date.city || date.clientId)
                ).length
              }
            </strong>
          </div>
        </article>
      </section>

      <section className="commemorative-section">
        <div className="commemorative-section-heading">
          <div>
            <span className="micro-label">BASE DO SISTEMA</span>
            <h2>Calendário nacional</h2>
            <p>
              Datas fixas já disponíveis automaticamente nos planejamentos.
            </p>
          </div>
          <span>{national.length} datas</span>
        </div>

        <div className="commemorative-grid">
          {national.map((date) => (
            <article className="commemorative-card national" key={date.id}>
              <div className="commemorative-date-box">
                <strong>{String(date.day).padStart(2, "0")}</strong>
                <span>{monthNames[date.month - 1].slice(0, 3)}</span>
              </div>
              <div className="commemorative-card-copy">
                <span className="commemorative-scope">Nacional</span>
                <h3>{date.name}</h3>
                <p>{date.description || "Data nacional."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="commemorative-section">
        <div className="commemorative-section-heading">
          <div>
            <span className="micro-label">PERSONALIZADO</span>
            <h2>Datas da agência</h2>
            <p>
              Aniversários de cidades, profissões, segmentos e oportunidades
              específicas dos clientes.
            </p>
          </div>
          <span>{custom.length} datas</span>
        </div>

        {custom.length === 0 ? (
          <div className="commemorative-empty">
            <FiStar aria-hidden="true" />
            <strong>Nenhuma data personalizada ainda.</strong>
            <p>
              Cadastre datas relevantes para a região, nicho ou calendário de
              um cliente específico.
            </p>
          </div>
        ) : (
          <div className="commemorative-custom-list">
            {custom.map((date) => (
              <article
                className={
                  date.active
                    ? "commemorative-custom-row"
                    : "commemorative-custom-row inactive"
                }
                key={date.id}
              >
                <div className="commemorative-custom-date">
                  <strong>{dateLabel(date)}</strong>
                  <small>
                    {date.year ? "Somente neste ano" : "Repete todos os anos"}
                  </small>
                </div>

                <div className="commemorative-custom-copy">
                  <h3>{date.name}</h3>
                  <p>{date.description || "Sem observação."}</p>
                </div>

                <div className="commemorative-custom-scope">
                  <span>{scopeLabel(date)}</span>
                  {date.city || date.state ? (
                    <small>
                      {[date.city, date.state].filter(Boolean).join(" · ")}
                    </small>
                  ) : null}
                </div>

                <span
                  className={
                    date.active
                      ? "account-status-chip active"
                      : "account-status-chip inactive"
                  }
                >
                  {date.active ? "Ativa" : "Inativa"}
                </span>

                {canManage ? (
                  <div className="commemorative-row-actions">
                    <Link
                      href={`/datas-comemorativas?edit=${date.id}`}
                      className="button button-ghost button-small"
                      scroll={false}
                    >
                      <FiEdit3 aria-hidden="true" />
                      Editar
                    </Link>
                    <form action={toggleCommemorativeDate}>
                      <input type="hidden" name="id" value={date.id} />
                      <input type="hidden" name="name" value={date.name} />
                      <input type="hidden" name="day" value={date.day} />
                      <input type="hidden" name="month" value={date.month} />
                      <input
                        type="hidden"
                        name="year"
                        value={date.year ?? ""}
                      />
                      <input
                        type="hidden"
                        name="city"
                        value={date.city ?? ""}
                      />
                      <input
                        type="hidden"
                        name="state"
                        value={date.state ?? ""}
                      />
                      <input
                        type="hidden"
                        name="description"
                        value={date.description ?? ""}
                      />
                      <input
                        type="hidden"
                        name="tags"
                        value={date.tags ?? ""}
                      />
                      <input
                        type="hidden"
                        name="clientId"
                        value={date.clientId ?? ""}
                      />
                      <input
                        type="hidden"
                        name="nextActive"
                        value={date.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="button button-ghost button-small"
                      >
                        {date.active ? "Inativar" : "Reativar"}
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {showModal ? (
        <div className="modal-layer">
          <Link
            href="/datas-comemorativas"
            className="modal-backdrop"
            aria-label="Fechar"
            scroll={false}
          />
          <section
            className="user-edit-modal commemorative-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="commemorative-modal-title"
          >
            <div className="user-edit-heading">
              <div>
                <span className="micro-label">
                  {editingDate ? "EDITAR DATA" : "NOVA OPORTUNIDADE"}
                </span>
                <h2 id="commemorative-modal-title">
                  {editingDate
                    ? editingDate.name
                    : "Cadastrar data comemorativa"}
                </h2>
                <p>
                  Datas personalizadas podem valer para todos os clientes ou
                  para uma conta específica.
                </p>
              </div>
              <Link
                href="/datas-comemorativas"
                className="modal-close"
                aria-label="Fechar"
                scroll={false}
              >
                <FiX aria-hidden="true" />
              </Link>
            </div>

            <DateForm
              date={editingDate}
              clients={clients.map((client) => ({
                id: client.id,
                name: client.name
              }))}
            />
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiFolderPlus,
  FiPlus,
  FiUser
} from "react-icons/fi";
import { createStandaloneArtwork } from "../app/actions";
import type { ContractUsage } from "../lib/api";

type ClientOption = {
  id: string;
  name: string;
  assignedDesignerId: string | null;
  defaultStandaloneSlaHours: number;
};

type DesignerOption = {
  id: string;
  name: string;
  usedPoints: number;
  capacityPoints: number;
};

const formats = {
  POST: [
    { value: "1080x1350", label: "Feed vertical · 1080×1350" },
    { value: "1080x1080", label: "Quadrado · 1080×1080" }
  ],
  CAROUSEL: [
    { value: "1080x1350", label: "Vertical · 1080×1350 por slide" },
    { value: "1080x1080", label: "Quadrado · 1080×1080 por slide" }
  ],
  REEL: [{ value: "1080x1920", label: "Vertical · 1080×1920" }],
  STORY: [{ value: "1080x1920", label: "Story · 1080×1920" }]
} as const;

const basePoints = {
  POST: 1,
  CAROUSEL: 3,
  REEL: 3,
  STORY: 1
} as const;

function localDateTime(hours: number) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function safeSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase() || "nome-da-demanda";
}

function usageText(used: number, limit: number | null) {
  return limit === null ? `${used} usados · sem limite` : `${used}/${limit}`;
}

export function StandaloneArtworkCreateForm({
  clients,
  designers,
  contractUsage,
  actor,
  embedded = false,
  onCreated
}: {
  clients: ClientOption[];
  designers: DesignerOption[];
  contractUsage: ContractUsage[];
  actor: {
    id: string;
    name: string;
    role: "DESIGNER" | "ADMIN" | "DEV";
  };
  embedded?: boolean;
  onCreated?: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Array<keyof typeof formats>>(["POST"]);
  const [outputFormats, setOutputFormats] = useState<Record<keyof typeof formats, string>>({
    POST: "1080x1350",
    CAROUSEL: "1080x1350",
    REEL: "1080x1920",
    STORY: "1080x1920"
  });
  const [outputQuantities, setOutputQuantities] = useState<Record<keyof typeof formats, number>>({
    POST: 1,
    CAROUSEL: 1,
    REEL: 1,
    STORY: 1
  });
  const [effortPoints, setEffortPoints] = useState(1);
  const [pointsManual, setPointsManual] = useState(false);
  const [title, setTitle] = useState("");
  const [designerId, setDesignerId] = useState(
    actor.role === "DESIGNER" ? actor.id : ""
  );
  const [dueAt, setDueAt] = useState("");

  const selectedClient =
    clients.find((client) => client.id === clientId) ?? null;
  const usage = contractUsage.find((item) => item.clientId === clientId) ?? null;
  const selectedDesigner =
    designers.find((item) => item.id === designerId) ??
    (actor.role === "DESIGNER"
      ? designers.find((item) => item.id === actor.id)
      : null);

  const totalQuantity = selectedTypes.reduce(
    (sum, type) => sum + outputQuantities[type],
    0
  );
  const suggestedPoints = selectedTypes.reduce(
    (sum, type) => sum + basePoints[type] * outputQuantities[type],
    0
  );
  const projectedStandalone = usage
    ? usage.usage.standalone + totalQuantity
    : totalQuantity;
  const projectedPoints = usage ? usage.usage.points + effortPoints : effortPoints;
  const standaloneExtra =
    usage?.limits.standalone !== null &&
    usage?.limits.standalone !== undefined &&
    projectedStandalone > usage.limits.standalone;
  const pointsExtra =
    usage?.limits.points !== null &&
    usage?.limits.points !== undefined &&
    projectedPoints > usage.limits.points;
  const contractExtra = Boolean(standaloneExtra || pointsExtra);

  const folderPreview = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `/Artes avulsas/${year}/${month}/${safeSegment(title)}-xxxxxx/`;
  }, [title]);

  async function submit(formData: FormData) {
    await createStandaloneArtwork(formData);
    onCreated?.();
  }

  function changeClient(nextClientId: string) {
    setClientId(nextClientId);
    const client = clients.find((item) => item.id === nextClientId);
    if (!client) return;

    setDueAt(localDateTime(client.defaultStandaloneSlaHours));
    if (actor.role !== "DESIGNER" && client.assignedDesignerId) {
      setDesignerId(client.assignedDesignerId);
    }
  }

  function toggleType(type: keyof typeof formats) {
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        if (current.length === 1) return current;
        const next = current.filter((item) => item !== type);
        if (!pointsManual) {
          setEffortPoints(
            next.reduce(
              (sum, item) => sum + basePoints[item] * outputQuantities[item],
              0
            )
          );
        }
        return next;
      }

      const next = [...current, type];
      if (!pointsManual) {
        setEffortPoints(
          next.reduce(
            (sum, item) => sum + basePoints[item] * outputQuantities[item],
            0
          )
        );
      }
      return next;
    });
  }

  function changeOutputQuantity(
    type: keyof typeof formats,
    nextQuantity: number
  ) {
    const normalized = Math.max(1, Math.min(50, nextQuantity || 1));
    const next = { ...outputQuantities, [type]: normalized };
    setOutputQuantities(next);

    if (!pointsManual) {
      setEffortPoints(
        selectedTypes.reduce(
          (sum, item) => sum + basePoints[item] * next[item],
          0
        )
      );
    }
  }

  return (
    <form
      action={submit}
      className={
        embedded
          ? "standalone-smart-form standalone-smart-form-embedded"
          : "standalone-form-card standalone-smart-form"
      }
    >
      <input
        type="hidden"
        name="contentType"
        value={selectedTypes[0]}
      />
      <input
        type="hidden"
        name="formatLabel"
        value={outputFormats[selectedTypes[0]]}
      />
      <input type="hidden" name="quantity" value={totalQuantity} />
      <input
        type="hidden"
        name="outputs"
        value={JSON.stringify(
          selectedTypes.map((type) => ({
            contentType: type,
            formatLabel: outputFormats[type],
            quantity: outputQuantities[type],
            effortPoints: basePoints[type] * outputQuantities[type]
          }))
        )}
      />

      {!embedded ? (
        <div className="section-heading">
          <div>
            <span className="micro-label">NOVA DEMANDA</span>
            <h2>Criar arte avulsa</h2>
          </div>
          <FiPlus aria-hidden="true" />
        </div>
      ) : null}

      <div className="standalone-form-section">
        <div className="standalone-form-section-head">
          <strong>Demanda</strong>
          <small>Defina cliente, responsável e briefing.</small>
        </div>

        <label className="field">
          <span>Cliente</span>
          <select
            name="clientId"
            required
            value={clientId}
            onChange={(event) => changeClient(event.target.value)}
          >
            <option value="" disabled>Selecione</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>

        {actor.role === "DESIGNER" ? (
          <>
            <input type="hidden" name="designerId" value={actor.id} />
            <div className="standalone-responsible-readonly">
              <FiUser aria-hidden="true" />
              <span>
                <small>Responsável</small>
                <strong>{actor.name}</strong>
              </span>
              {selectedDesigner ? (
                <em>
                  {selectedDesigner.usedPoints}/{selectedDesigner.capacityPoints} pts
                </em>
              ) : null}
            </div>
          </>
        ) : (
          <label className="field">
            <span>Designer responsável</span>
            <select
              name="designerId"
              required
              value={designerId}
              onChange={(event) => setDesignerId(event.target.value)}
            >
              <option value="" disabled>Selecione</option>
              {designers
                .slice()
                .sort(
                  (a, b) =>
                    a.usedPoints / Math.max(1, a.capacityPoints) -
                    b.usedPoints / Math.max(1, b.capacityPoints)
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.usedPoints}/{item.capacityPoints} pts
                  </option>
                ))}
            </select>
            {selectedDesigner ? (
              <small className="field-hint">
                Carga atual: {selectedDesigner.usedPoints}/{selectedDesigner.capacityPoints} pts ·{" "}
                {Math.max(0, selectedDesigner.capacityPoints - selectedDesigner.usedPoints)} pts livres
              </small>
            ) : null}
          </label>
        )}

        <label className="field">
          <span>Título</span>
          <input
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Banner campanha de setembro"
          />
        </label>

        <label className="field">
          <span>Briefing</span>
          <textarea
            name="briefing"
            required
            rows={5}
            placeholder="Objetivo, mensagem, referências e orientações."
          />
        </label>
      </div>

      <div className="standalone-form-section">
        <div className="standalone-form-section-head">
          <strong>Produção</strong>
          <small>Formato e esforço sugeridos conforme o tipo.</small>
        </div>

        <div className="standalone-output-selector">
          <div className="standalone-output-selector-head">
            <div>
              <strong>Tipos de entrega</strong>
              <small>Selecione um ou mais tipos para a mesma demanda.</small>
            </div>
            <span>{totalQuantity} peça(s)</span>
          </div>

          <div className="standalone-output-types">
            {(Object.keys(formats) as Array<keyof typeof formats>).map((type) => {
              const active = selectedTypes.includes(type);
              const label = {
                POST: "Feed",
                CAROUSEL: "Carrossel",
                REEL: "Reel",
                STORY: "Story"
              }[type];

              return (
                <button
                  type="button"
                  className={active ? "standalone-output-type active" : "standalone-output-type"}
                  onClick={() => toggleType(type)}
                  key={type}
                >
                  <span>{label}</span>
                  <small>
                    {active ? `${outputQuantities[type]} selecionado(s)` : "Adicionar"}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="standalone-output-configs">
            {selectedTypes.map((type) => (
              <div className="standalone-output-config" key={type}>
                <div>
                  <strong>
                    {{
                      POST: "Feed",
                      CAROUSEL: "Carrossel",
                      REEL: "Reel",
                      STORY: "Story"
                    }[type]}
                  </strong>
                  <small>{basePoints[type]} pt por peça</small>
                </div>

                <label className="field">
                  <span>Formato</span>
                  <select
                    value={outputFormats[type]}
                    onChange={(event) =>
                      setOutputFormats((current) => ({
                        ...current,
                        [type]: event.target.value
                      }))
                    }
                  >
                    {formats[type].map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field standalone-output-quantity">
                  <span>Qtd.</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={outputQuantities[type]}
                    onChange={(event) =>
                      changeOutputQuantity(type, Number(event.target.value))
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="standalone-form-grid">
          <label className="field">
            <span>Pontos totais</span>
            <input
              type="number"
              min="1"
              max="200"
              name="effortPoints"
              value={effortPoints}
              onChange={(event) => {
                setPointsManual(true);
                setEffortPoints(Math.max(1, Number(event.target.value) || 1));
              }}
              required
            />
            <small className="field-hint">
              Sugestão: {suggestedPoints} pts
              {effortPoints !== suggestedPoints ? (
                <button
                  type="button"
                  className="inline-reset"
                  onClick={() => {
                    setPointsManual(false);
                    setEffortPoints(suggestedPoints);
                  }}
                >
                  usar sugestão
                </button>
              ) : null}
            </small>
          </label>

          <label className="field">
            <span>Prioridade</span>
            <select name="priority" defaultValue="NORMAL">
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </label>

          <label className="field">
            <span>Prazo</span>
            <input
              type="datetime-local"
              name="dueAt"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
            {selectedClient ? (
              <small className="field-hint">
                <FiClock aria-hidden="true" /> SLA padrão: {selectedClient.defaultStandaloneSlaHours}h
              </small>
            ) : null}
          </label>
        </div>
      </div>

      <div className="standalone-nextcloud-auto">
        <FiFolderPlus aria-hidden="true" />
        <div>
          <strong>Pasta criada automaticamente no Nextcloud</strong>
          <span>{folderPreview}</span>
          <small>
            Ao criar a demanda, o sistema prepara a pasta dentro do diretório do cliente.
          </small>
        </div>
      </div>

      {clientId && usage ? (
        <div className={contractExtra ? "standalone-contract-preview extra" : "standalone-contract-preview"}>
          <div className="standalone-contract-head">
            <span>
              {contractExtra ? (
                <FiAlertCircle aria-hidden="true" />
              ) : (
                <FiCheckCircle aria-hidden="true" />
              )}
              <strong>
                {contractExtra ? "Extra do contrato" : "Dentro da franquia"}
              </strong>
            </span>
            <small>Projeção após criar esta demanda</small>
          </div>
          <div className="standalone-contract-grid">
            <div>
              <small>Artes avulsas</small>
              <strong>
                {usageText(projectedStandalone, usage.limits.standalone)}
              </strong>
            </div>
            <div>
              <small>Pontos mensais</small>
              <strong>
                {usageText(projectedPoints, usage.limits.points)}
              </strong>
            </div>
            {selectedTypes.map((type) => {
              const key = type.toLowerCase() as "post" | "carousel" | "reel" | "story";
              const label = {
                POST: "Feed",
                CAROUSEL: "Carrossel",
                REEL: "Reel",
                STORY: "Story"
              }[type];
              return (
                <div key={type}>
                  <small>{label}</small>
                  <strong>
                    {usageText(
                      usage.usage[key] + outputQuantities[type],
                      usage.limits[key]
                    )}
                  </strong>
                </div>
              );
            })}
          </div>
          {contractExtra ? (
            <p>
              Esta demanda ultrapassa a franquia configurada e será identificada
              na Central de demandas como extra do contrato.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        className="button button-primary button-wide"
        type="submit"
        disabled={!clientId || !designerId}
      >
        <FiPlus aria-hidden="true" /> Criar demanda e preparar pasta
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiTool,
  FiUser
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  assignOperationalDemand,
  updateContentProductionStage,
  updateStandaloneArtworkStatus
} from "../app/actions";

export type KanbanColumn =
  | "WAITING"
  | "PRODUCTION"
  | "APPROVAL"
  | "CHANGES"
  | "DONE";

export type OperationalKanbanCard = {
  id: string;
  source: "calendar" | "standalone";
  calendarId?: string;
  clientId: string;
  clientName: string;
  context: string;
  title: string;
  status: string;
  column: KanbanColumn;
  points: number;
  quantity: number;
  dueAt: string | null;
  href: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  nextcloudPath?: string | null;
  designerId: string | null;
  designerName: string;
  contractExtra: boolean;
  extraReasons: string[];
  movable: boolean;
};

const columns: Array<{
  key: KanbanColumn;
  label: string;
  description: string;
  icon: typeof FiClock;
}> = [
  {
    key: "WAITING",
    label: "Aguardando",
    description: "Prontas para iniciar",
    icon: FiClock
  },
  {
    key: "PRODUCTION",
    label: "Em produção",
    description: "Sendo executadas",
    icon: FiTool
  },
  {
    key: "APPROVAL",
    label: "Aprovação",
    description: "Aguardando cliente",
    icon: FiCheckCircle
  },
  {
    key: "CHANGES",
    label: "Ajustes",
    description: "Com alteração solicitada",
    icon: FiRefreshCw
  },
  {
    key: "DONE",
    label: "Concluído",
    description: "Aprovadas ou entregues",
    icon: FiCheckCircle
  }
];

function sla(value: string | null) {
  if (!value) return { key: "neutral", label: "Sem prazo" };

  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.ceil(diff / (60 * 60 * 1000));

  if (hours < 0) {
    return {
      key: "overdue",
      label: `${Math.max(1, Math.ceil(Math.abs(hours) / 24))}d atrasada`
    };
  }

  if (hours <= 24) {
    return {
      key: "risk",
      label: hours <= 1 ? "Vence em 1h" : `Vence em ${hours}h`
    };
  }

  return {
    key: "ok",
    label: hours <= 48 ? `Vence em ${hours}h` : `${Math.ceil(hours / 24)}d`
  };
}

function standaloneStatus(column: KanbanColumn) {
  if (column === "WAITING") return "REQUESTED";
  if (column === "PRODUCTION") return "IN_PRODUCTION";
  if (column === "APPROVAL") return "IN_APPROVAL";
  if (column === "CHANGES") return "CHANGES_REQUESTED";
  return "DELIVERED";
}

function calendarStage(column: KanbanColumn) {
  if (column === "WAITING") return "DESIGN_PENDING";
  if (column === "PRODUCTION") return "DESIGN_IN_PROGRESS";
  return null;
}

function priorityScore(card: OperationalKanbanCard) {
  if (card.column === "DONE") return -1000;

  let score = 0;
  const deadline = sla(card.dueAt);

  if (deadline.key === "overdue") score += 100;
  if (deadline.key === "risk") score += 65;
  if (card.column === "CHANGES") score += 55;
  if (card.column === "PRODUCTION") score += 20;
  if (card.column === "WAITING") score += 15;
  if (card.priority === "URGENT") score += 45;
  if (card.priority === "HIGH") score += 25;
  if (card.contractExtra) score += 5;

  if (card.dueAt) {
    const hours = Math.ceil(
      (new Date(card.dueAt).getTime() - Date.now()) / (60 * 60 * 1000)
    );
    if (hours > 24 && hours <= 48) score += 15;
    if (hours > 48 && hours <= 72) score += 8;
  }

  return score;
}

function priorityLabel(score: number) {
  if (score >= 100) return "Crítica";
  if (score >= 65) return "Alta";
  if (score >= 35) return "Média";
  return "Normal";
}

function priorityTone(score: number) {
  if (score >= 100) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "normal";
}

function nextBusinessDays(count = 5) {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (days.length < count) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function shortWeekday(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short"
  })
    .format(value)
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

export function OperationalKanban({
  initialCards,
  designers,
  canReassign
}: {
  initialCards: OperationalKanbanCard[];
  designers: Array<{
    id: string;
    name: string;
    usedPoints: number;
    capacityPoints: number;
    remainingPoints: number;
    percentage: number;
    activeDemands: number;
  }>;
  canReassign: boolean;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDrop, setActiveDrop] = useState<KanbanColumn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capacityState, setCapacityState] = useState(designers);
  const [isPending, startTransition] = useTransition();

  const recommendedDesigner = useMemo(
    () =>
      [...capacityState].sort(
        (a, b) =>
          b.remainingPoints - a.remainingPoints ||
          a.usedPoints - b.usedPoints
      )[0] ?? null,
    [capacityState]
  );

  const rankedCards = useMemo(
    () =>
      cards
        .map((card) => ({
          ...card,
          operationalScore: priorityScore(card)
        }))
        .sort((a, b) => {
          if (b.operationalScore !== a.operationalScore) {
            return b.operationalScore - a.operationalScore;
          }
          const ad = a.dueAt
            ? new Date(a.dueAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          const bd = b.dueAt
            ? new Date(b.dueAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }),
    [cards]
  );

  const grouped = useMemo(
    () =>
      columns.reduce(
        (acc, column) => {
          acc[column.key] = rankedCards.filter(
            (card) => card.column === column.key
          );
          return acc;
        },
        {} as Record<
          KanbanColumn,
          Array<OperationalKanbanCard & { operationalScore: number }>
        >
      ),
    [rankedCards]
  );

  const focusToday = useMemo(
    () =>
      rankedCards
        .filter((card) => card.column !== "DONE")
        .slice(0, 5),
    [rankedCards]
  );

  const weeklyPlan = useMemo(() => {
    const days = nextBusinessDays(5);
    const slots = new Map<
      string,
      Array<{
        date: Date;
        capacity: number;
        used: number;
        cards: Array<
          OperationalKanbanCard & { operationalScore: number }
        >;
      }>
    >();

    for (const item of capacityState) {
      slots.set(
        item.id,
        days.map((date) => ({
          date,
          capacity: item.capacityPoints / 5,
          used: 0,
          cards: []
        }))
      );
    }

    const active = rankedCards.filter(
      (card) => card.column !== "DONE" && card.designerId
    );

    for (const card of active) {
      const designerSlots = card.designerId
        ? slots.get(card.designerId)
        : undefined;
      if (!designerSlots) continue;

      let latestIndex = designerSlots.length - 1;

      if (card.dueAt) {
        const due = new Date(card.dueAt);
        due.setHours(23, 59, 59, 999);
        const dueIndex = designerSlots.findIndex(
          (slot) => slot.date.getTime() > due.getTime()
        );
        latestIndex =
          dueIndex === -1
            ? designerSlots.length - 1
            : Math.max(0, dueIndex - 1);
      }

      const candidates = designerSlots.slice(0, latestIndex + 1);
      let selected =
        candidates.find(
          (slot) => slot.used + card.points <= slot.capacity
        ) ??
        [...candidates].sort((a, b) => {
          const aRatio =
            a.capacity > 0 ? a.used / a.capacity : Number.POSITIVE_INFINITY;
          const bRatio =
            b.capacity > 0 ? b.used / b.capacity : Number.POSITIVE_INFINITY;
          return aRatio - bRatio;
        })[0];

      if (!selected) selected = designerSlots[0];
      selected.used += card.points;
      selected.cards.push(card);
    }

    return days.map((date, index) => {
      const perDesigner = capacityState.map((designer) => {
        const slot = slots.get(designer.id)?.[index];
        return {
          id: designer.id,
          name: designer.name,
          capacity: slot?.capacity ?? designer.capacityPoints / 5,
          used: slot?.used ?? 0,
          cards: slot?.cards ?? []
        };
      });

      const used = perDesigner.reduce((sum, item) => sum + item.used, 0);
      const capacity = perDesigner.reduce(
        (sum, item) => sum + item.capacity,
        0
      );
      const overload = perDesigner.filter(
        (item) => item.used > item.capacity
      );
      const cards = perDesigner
        .flatMap((item) => item.cards)
        .sort(
          (a, b) => b.operationalScore - a.operationalScore
        );

      return {
        date,
        used,
        capacity,
        percentage:
          capacity > 0 ? Math.round((used / capacity) * 100) : 0,
        overload,
        cards
      };
    });
  }, [capacityState, rankedCards]);

  function suggestedDesignerFor(card: OperationalKanbanCard) {
    if (capacityState.length === 0) return null;

    return [...capacityState]
      .map((item) => {
        const projectedPoints =
          item.id === card.designerId
            ? item.usedPoints
            : item.usedPoints + card.points;
        const projectedPercentage =
          item.capacityPoints > 0
            ? projectedPoints / item.capacityPoints
            : Number.POSITIVE_INFINITY;

        return {
          ...item,
          projectedPoints,
          projectedPercentage
        };
      })
      .sort(
        (a, b) =>
          a.projectedPercentage - b.projectedPercentage ||
          b.remainingPoints - a.remainingPoints ||
          a.activeDemands - b.activeDemands
      )[0];
  }

  function canMoveTo(card: OperationalKanbanCard, target: KanbanColumn) {
    if (!card.movable || card.column === target) return false;

    if (card.source === "calendar") {
      return (
        ["WAITING", "PRODUCTION", "CHANGES"].includes(card.column) &&
        ["WAITING", "PRODUCTION"].includes(target)
      );
    }

    if (card.column === "DONE") return false;
    return true;
  }

  function move(card: OperationalKanbanCard, target: KanbanColumn) {
    if (!canMoveTo(card, target)) return;

    const previous = cards;
    setError(null);
    setCards((current) =>
      current.map((item) =>
        item.id === card.id && item.source === card.source
          ? { ...item, column: target }
          : item
      )
    );

    const formData = new FormData();

    startTransition(async () => {
      try {
        if (card.source === "standalone") {
          formData.set("id", card.id);
          formData.set("status", standaloneStatus(target));
          if (card.nextcloudPath) {
            formData.set("nextcloudPath", card.nextcloudPath);
          }
          await updateStandaloneArtworkStatus(formData);
        } else {
          const stage = calendarStage(target);
          if (!stage || !card.calendarId) {
            setCards(previous);
            return;
          }
          formData.set("itemId", card.id);
          formData.set("calendarId", card.calendarId);
          formData.set("stage", stage);
          await updateContentProductionStage(formData);
        }

        router.refresh();
      } catch (cause) {
        setCards(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível movimentar a demanda."
        );
      }
    });
  }

  function assignDesigner(card: OperationalKanbanCard, designerId: string) {
    if (!designerId || designerId === card.designerId) return;

    const selected = capacityState.find((item) => item.id === designerId);
    if (!selected) return;

    const currentOwner = capacityState.find(
      (item) => item.id === card.designerId
    );
    const projectedPoints = selected.usedPoints + card.points;
    const projectedPercentage =
      selected.capacityPoints > 0
        ? Math.round((projectedPoints / selected.capacityPoints) * 100)
        : 0;

    if (
      projectedPoints > selected.capacityPoints &&
      !window.confirm(
        `${selected.name} ficará com ${projectedPoints}/${selected.capacityPoints} pontos (${projectedPercentage}%). Deseja atribuir mesmo assim?`
      )
    ) {
      return;
    }

    const previous = cards;
    const previousCapacity = capacityState;
    setError(null);
    setCards((current) =>
      current.map((item) =>
        item.id === card.id && item.source === card.source
          ? {
              ...item,
              designerId: selected.id,
              designerName: selected.name
            }
          : item
      )
    );
    setCapacityState((current) =>
      current.map((item) => {
        const delta =
          item.id === selected.id
            ? card.points
            : item.id === currentOwner?.id
              ? -card.points
              : 0;
        if (!delta) return item;
        const usedPoints = Math.max(0, item.usedPoints + delta);
        return {
          ...item,
          usedPoints,
          remainingPoints: item.capacityPoints - usedPoints,
          percentage:
            item.capacityPoints > 0
              ? Math.round((usedPoints / item.capacityPoints) * 100)
              : 0,
          activeDemands: Math.max(
            0,
            item.activeDemands + (delta > 0 ? 1 : -1)
          )
        };
      })
    );

    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("source", card.source);
    formData.set("designerId", designerId);
    if (card.calendarId) formData.set("calendarId", card.calendarId);

    startTransition(async () => {
      try {
        await assignOperationalDemand(formData);
        router.refresh();
      } catch (cause) {
        setCards(previous);
        setCapacityState(previousCapacity);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível reatribuir a demanda."
        );
      }
    });
  }

  return (
    <section className="operational-kanban-wrap">
      <div className="operational-kanban-help">
        <div>
          <strong>Kanban operacional</strong>
          <span>
            Arraste demandas entre etapas permitidas. Gestores podem
            reatribuir o responsável diretamente no card; itens acima da
            franquia aparecem como Extra do contrato.
          </span>
        </div>
        {isPending ? <em>Salvando alteração...</em> : null}
      </div>

      {capacityState.length > 0 ? (
        <div className="kanban-capacity-strip">
          <div className="kanban-capacity-title">
            <strong>WIP / capacidade</strong>
            <span>
              {recommendedDesigner
                ? `Mais disponível: ${recommendedDesigner.name} · ${Math.max(0, recommendedDesigner.remainingPoints)} pts livres`
                : "Capacidade da equipe"}
            </span>
          </div>
          <div className="kanban-capacity-list">
            {capacityState
              .slice()
              .sort((a, b) => b.percentage - a.percentage)
              .map((item) => (
                <article
                  className={
                    item.percentage > 100
                      ? "kanban-capacity-card overloaded"
                      : item.percentage >= 80
                        ? "kanban-capacity-card warning"
                        : "kanban-capacity-card"
                  }
                  key={item.id}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.usedPoints}/{item.capacityPoints} pts</span>
                  </div>
                  <div className="kanban-capacity-track">
                    <i style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                  </div>
                  <small>
                    {item.percentage > 100
                      ? `${item.usedPoints - item.capacityPoints} pts acima`
                      : `${item.remainingPoints} pts livres · ${item.activeDemands} demanda(s)`}
                  </small>
                </article>
              ))}
          </div>
        </div>
      ) : null}

      {weeklyPlan.length > 0 ? (
        <div className="kanban-week-plan">
          <div className="kanban-week-head">
            <div>
              <strong>Planejamento dos próximos 5 dias úteis</strong>
              <span>
                Distribuição sugerida pela capacidade diária e pelos prazos das demandas.
              </span>
            </div>
            <small>
              Capacidade diária = capacidade semanal ÷ 5
            </small>
          </div>

          <div className="kanban-week-grid">
            {weeklyPlan.map((day) => (
              <article
                className={
                  day.percentage > 100
                    ? "kanban-week-day overloaded"
                    : day.percentage >= 85
                      ? "kanban-week-day warning"
                      : "kanban-week-day"
                }
                key={day.date.toISOString()}
              >
                <header>
                  <div>
                    <strong>{shortWeekday(day.date)}</strong>
                    <span>{shortDate(day.date)}</span>
                  </div>
                  <em>
                    {Math.round(day.used * 10) / 10}/
                    {Math.round(day.capacity * 10) / 10} pts
                  </em>
                </header>

                <div className="kanban-week-track">
                  <i
                    style={{
                      width: `${Math.min(day.percentage, 100)}%`
                    }}
                  />
                </div>

                <div className="kanban-week-summary">
                  <span>{day.percentage}% da capacidade</span>
                  <span>{day.cards.length} demanda(s)</span>
                </div>

                {day.overload.length > 0 ? (
                  <div className="kanban-week-alert">
                    <FiAlertCircle aria-hidden="true" />
                    <span>
                      Sobrecarga:{" "}
                      {day.overload
                        .map((item) => item.name)
                        .join(", ")}
                    </span>
                  </div>
                ) : null}

                <div className="kanban-week-cards">
                  {day.cards.length === 0 ? (
                    <small>Capacidade disponível</small>
                  ) : (
                    day.cards.slice(0, 3).map((card) => (
                      <Link
                        href={card.href}
                        key={`week-${day.date.toISOString()}-${card.source}-${card.id}`}
                      >
                        <span>
                          <strong>{card.title}</strong>
                          <small>
                            {card.designerName} · {card.points} pts
                          </small>
                        </span>
                        <em>{priorityLabel(card.operationalScore)}</em>
                      </Link>
                    ))
                  )}
                  {day.cards.length > 3 ? (
                    <small>
                      +{day.cards.length - 3} demanda(s) planejada(s)
                    </small>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {focusToday.length > 0 ? (
        <div className="kanban-focus-panel">
          <div className="kanban-focus-head">
            <div>
              <strong>Foco de hoje</strong>
              <span>
                Ordem sugerida por prazo, SLA, ajustes e prioridade.
              </span>
            </div>
            <small>Top {focusToday.length}</small>
          </div>
          <div className="kanban-focus-list">
            {focusToday.map((card, index) => {
              const suggested = suggestedDesignerFor(card);
              const score = priorityScore(card);

              return (
                <article
                  className={`kanban-focus-item priority-${priorityTone(score)}`}
                  key={`focus-${card.source}-${card.id}`}
                >
                  <span className="kanban-focus-rank">{index + 1}</span>
                  <div className="kanban-focus-main">
                    <strong>{card.title}</strong>
                    <span>
                      {card.clientName} · {card.designerName}
                    </span>
                  </div>
                  <div className="kanban-focus-meta">
                    <span>{priorityLabel(score)}</span>
                    <small>{sla(card.dueAt).label}</small>
                  </div>
                  {canReassign &&
                  suggested &&
                  suggested.id !== card.designerId ? (
                    <button
                      className="kanban-suggest-button"
                      type="button"
                      disabled={isPending}
                      onClick={() => assignDesigner(card, suggested.id)}
                    >
                      Sugerir {suggested.name}
                    </button>
                  ) : null}
                  <Link href={card.href}>Abrir</Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="kanban-error" role="alert">
          <FiAlertCircle aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="operational-kanban">
        {columns.map((column) => {
          const items = grouped[column.key];
          const points = items.reduce((sum, card) => sum + card.points, 0);
          const Icon = column.icon;

          return (
            <section
              className={
                activeDrop === column.key
                  ? "kanban-column is-drop-target"
                  : "kanban-column"
              }
              key={column.key}
              onDragOver={(event) => {
                event.preventDefault();
                setActiveDrop(column.key);
              }}
              onDragLeave={() => setActiveDrop(null)}
              onDrop={(event) => {
                event.preventDefault();
                setActiveDrop(null);
                const [source, id] = event.dataTransfer
                  .getData("text/plain")
                  .split(":");
                const card = cards.find(
                  (item) => item.id === id && item.source === source
                );
                if (card) move(card, column.key);
              }}
            >
              <header className="kanban-column-head">
                <div>
                  <span className="kanban-column-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{column.label}</strong>
                    <small>{column.description}</small>
                  </div>
                </div>
                <span className="kanban-column-count">{items.length}</span>
              </header>

              <div className="kanban-column-metrics">
                <span>{points} pts</span>
                <span>
                  {items.reduce((sum, card) => sum + card.quantity, 0)} peça(s)
                </span>
              </div>

              <div className="kanban-cards">
                {items.length === 0 ? (
                  <div className="kanban-empty">Solte uma demanda aqui</div>
                ) : (
                  items.map((card) => {
                    const deadline = sla(card.dueAt);
                    const score = priorityScore(card);
                    const suggested = suggestedDesignerFor(card);
                    const isDragging =
                      draggingId === `${card.source}:${card.id}`;

                    return (
                      <article
                        className={
                          isDragging
                            ? "kanban-card is-dragging"
                            : card.contractExtra
                              ? "kanban-card is-contract-extra"
                              : "kanban-card"
                        }
                        key={`${card.source}-${card.id}`}
                        draggable={card.movable && !isPending}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "text/plain",
                            `${card.source}:${card.id}`
                          );
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingId(`${card.source}:${card.id}`);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setActiveDrop(null);
                        }}
                      >
                        <div className="kanban-card-top">
                          <span className="kanban-source">
                            {card.source === "calendar" ? (
                              <><FiLayers /> Calendário</>
                            ) : (
                              <><FiImage /> Avulsa</>
                            )}
                          </span>
                          <span className={`kanban-sla ${deadline.key}`}>
                            {deadline.label}
                          </span>
                        </div>

                        {card.contractExtra ? (
                          <div className="kanban-extra-badge">
                            <FiAlertCircle aria-hidden="true" />
                            <span>
                              <strong>Extra do contrato</strong>
                              <small>{card.extraReasons.join(" · ")}</small>
                            </span>
                          </div>
                        ) : null}

                        <div className="kanban-card-main">
                          <strong>{card.title}</strong>
                          <span>{card.clientName}</span>
                          <small>{card.context}</small>
                        </div>

                        <div className="kanban-card-meta">
                          <span
                            className={`kanban-operational-priority priority-${priorityTone(score)}`}
                          >
                            {priorityLabel(score)}
                          </span>
                          <span>{card.quantity} peça(s)</span>
                          <span>{card.points} pts</span>
                          {card.priority &&
                          ["HIGH", "URGENT"].includes(card.priority) ? (
                            <span className="kanban-priority">
                              {card.priority === "URGENT" ? "Urgente" : "Alta"}
                            </span>
                          ) : null}
                        </div>

                        <div className="kanban-assignee">
                          <div>
                            <FiUser aria-hidden="true" />
                            <span>
                              <small>Responsável</small>
                              <strong>{card.designerName}</strong>
                            </span>
                          </div>
                          {canReassign &&
                          card.column !== "DONE" &&
                          suggested &&
                          suggested.id !== card.designerId ? (
                            <button
                              className="kanban-recommend"
                              type="button"
                              disabled={isPending}
                              title={`Carga projetada: ${suggested.projectedPoints}/${suggested.capacityPoints} pts`}
                              onClick={() =>
                                assignDesigner(card, suggested.id)
                              }
                            >
                              Sugerir {suggested.name}
                            </button>
                          ) : null}
                          {canReassign && card.column !== "DONE" ? (
                            <select
                              aria-label={`Reatribuir ${card.title}`}
                              value={card.designerId ?? ""}
                              disabled={isPending}
                              onMouseDown={(event) => event.stopPropagation()}
                              onDragStart={(event) => event.preventDefault()}
                              onChange={(event) =>
                                assignDesigner(card, event.target.value)
                              }
                            >
                              <option value="" disabled>
                                Selecionar
                              </option>
                              {capacityState
                                .slice()
                                .sort(
                                  (a, b) =>
                                    b.remainingPoints - a.remainingPoints
                                )
                                .map((item) => {
                                  const projected =
                                    item.id === card.designerId
                                      ? item.usedPoints
                                      : item.usedPoints + card.points;
                                  const suffix =
                                    projected > item.capacityPoints
                                      ? " · sobrecarga"
                                      : ` · ${Math.max(
                                          0,
                                          item.capacityPoints - projected
                                        )} pts livres`;

                                  return (
                                    <option key={item.id} value={item.id}>
                                      {item.name} · {item.usedPoints}/{item.capacityPoints} pts{suffix}
                                    </option>
                                  );
                                })}
                            </select>
                          ) : null}
                        </div>

                        <footer className="kanban-card-footer">
                          <span>{card.status}</span>
                          <Link href={card.href}>
                            Abrir <FiArrowRight aria-hidden="true" />
                          </Link>
                        </footer>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

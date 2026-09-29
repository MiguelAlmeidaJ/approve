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
  FiTool
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
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

export function OperationalKanban({
  initialCards
}: {
  initialCards: OperationalKanbanCard[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDrop, setActiveDrop] = useState<KanbanColumn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(
    () =>
      columns.reduce(
        (acc, column) => {
          acc[column.key] = cards.filter((card) => card.column === column.key);
          return acc;
        },
        {} as Record<KanbanColumn, OperationalKanbanCard[]>
      ),
    [cards]
  );

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

  return (
    <section className="operational-kanban-wrap">
      <div className="operational-kanban-help">
        <div>
          <strong>Kanban operacional</strong>
          <span>
            Arraste artes avulsas entre as etapas. Peças de calendário podem ser
            puxadas para produção e devolvidas para aguardando; aprovação segue
            o fluxo do calendário.
          </span>
        </div>
        {isPending ? <em>Salvando movimentação...</em> : null}
      </div>

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
                    const isDragging =
                      draggingId === `${card.source}:${card.id}`;

                    return (
                      <article
                        className={
                          isDragging
                            ? "kanban-card is-dragging"
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

                        <div className="kanban-card-main">
                          <strong>{card.title}</strong>
                          <span>{card.clientName}</span>
                          <small>{card.context}</small>
                        </div>

                        <div className="kanban-card-meta">
                          <span>{card.quantity} peça(s)</span>
                          <span>{card.points} pts</span>
                          {card.priority &&
                          ["HIGH", "URGENT"].includes(card.priority) ? (
                            <span className="kanban-priority">
                              {card.priority === "URGENT" ? "Urgente" : "Alta"}
                            </span>
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

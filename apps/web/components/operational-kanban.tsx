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
import { Fragment, useMemo, useState, useTransition } from "react";
import {
  assignOperationalDemand,
  resolveOperationalConflicts,
  updateContentProductionStage,
  updateOperationalPlannedDate,
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
  plannedProductionDate: string | null;
  completedAt: string | null;
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

function dateOnlyKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function currentBusinessWeekRange() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekday = now.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(now);
  start.setDate(now.getDate() + offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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
  const [view, setView] = useState<"kanban" | "planning" | "capacity">("kanban");
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
    const explicitlyPlanned = active.filter(
      (card) => card.plannedProductionDate
    );
    const automatic = active.filter(
      (card) => !card.plannedProductionDate
    );

    for (const card of explicitlyPlanned) {
      const designerSlots = card.designerId
        ? slots.get(card.designerId)
        : undefined;
      if (!designerSlots || !card.plannedProductionDate) continue;

      const plannedKey = dateOnlyKey(card.plannedProductionDate);
      const selected = designerSlots.find(
        (slot) => dateOnlyKey(slot.date) === plannedKey
      );
      if (!selected) continue;

      selected.used += card.points;
      selected.cards.push(card);
    }

    for (const card of automatic) {
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
        cards,
        perDesigner
      };
    });
  }, [capacityState, rankedCards]);

  const operationalAlerts = useMemo(() => {
    const now = new Date();
    const todayKey = dateOnlyKey(now);
    const alerts: Array<{
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      message: string;
      href?: string;
      cardKey?: string;
    }> = [];

    for (const card of rankedCards) {
      if (card.column === "DONE") continue;

      const cardKey = `${card.source}:${card.id}`;
      const deadline = sla(card.dueAt);

      if (
        card.plannedProductionDate &&
        dateOnlyKey(card.plannedProductionDate) < todayKey
      ) {
        alerts.push({
          id: `planned-overdue-${cardKey}`,
          severity: "critical",
          title: "Planejamento vencido",
          message: `${card.title} · ${card.clientName} · planejada para ${new Intl.DateTimeFormat(
            "pt-BR",
            { day: "2-digit", month: "2-digit" }
          ).format(new Date(card.plannedProductionDate))} e ainda não concluída.`,
          href: card.href,
          cardKey
        });
      }

      if (!card.designerId) {
        alerts.push({
          id: `no-owner-${cardKey}`,
          severity: "critical",
          title: "Demanda sem responsável",
          message: `${card.title} · ${card.clientName} precisa de um designer responsável.`,
          href: card.href,
          cardKey
        });
      }

      if (
        !card.plannedProductionDate &&
        (deadline.key === "risk" || deadline.key === "overdue")
      ) {
        alerts.push({
          id: `no-plan-${cardKey}`,
          severity: deadline.key === "overdue" ? "critical" : "warning",
          title:
            deadline.key === "overdue"
              ? "Atrasada e sem planejamento"
              : "Prazo próximo sem planejamento",
          message: `${card.title} · ${card.clientName} · ${deadline.label}.`,
          href: card.href,
          cardKey
        });
      }

      if (card.column === "CHANGES" && !card.plannedProductionDate) {
        alerts.push({
          id: `changes-unplanned-${cardKey}`,
          severity: "warning",
          title: "Ajuste sem replanejamento",
          message: `${card.title} · ${card.clientName} voltou para ajustes e ainda não tem dia definido.`,
          href: card.href,
          cardKey
        });
      }
    }

    for (const day of weeklyPlan) {
      for (const item of day.overload) {
        alerts.push({
          id: `overload-${item.id}-${dateOnlyKey(day.date)}`,
          severity: "warning",
          title: "Dia sobrecarregado",
          message: `${item.name} tem ${Math.round(item.used * 10) / 10}/${Math.round(
            item.capacity * 10
          ) / 10} pts em ${shortWeekday(day.date)} ${shortDate(day.date)}.`
        });
      }
    }

    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [rankedCards, weeklyPlan]);

  const alertSummary = useMemo(
    () => ({
      critical: operationalAlerts.filter(
        (alert) => alert.severity === "critical"
      ).length,
      warning: operationalAlerts.filter(
        (alert) => alert.severity === "warning"
      ).length,
      total: operationalAlerts.length
    }),
    [operationalAlerts]
  );

  const plannedVsDone = useMemo(() => {
    const { start, end } = currentBusinessWeekRange();

    return capacityState.map((designer) => {
      const plannedPoints = cards
        .filter(
          (card) =>
            card.designerId === designer.id &&
            card.plannedProductionDate &&
            new Date(card.plannedProductionDate) >= start &&
            new Date(card.plannedProductionDate) <= end
        )
        .reduce((sum, card) => sum + card.points, 0);

      const completedPoints = cards
        .filter(
          (card) =>
            card.designerId === designer.id &&
            card.completedAt &&
            new Date(card.completedAt) >= start &&
            new Date(card.completedAt) <= end
        )
        .reduce((sum, card) => sum + card.points, 0);

      return {
        id: designer.id,
        name: designer.name,
        plannedPoints,
        completedPoints,
        percentage:
          plannedPoints > 0
            ? Math.round((completedPoints / plannedPoints) * 100)
            : completedPoints > 0
              ? 100
              : 0
      };
    });
  }, [cards, capacityState]);


  function recommendedPlacementFor(card: OperationalKanbanCard) {
    const candidateDays = weeklyPlan.filter((day) => {
      if (!card.dueAt) return true;
      const due = new Date(card.dueAt);
      due.setHours(23, 59, 59, 999);
      return day.date.getTime() <= due.getTime();
    });
    const days = candidateDays.length > 0 ? candidateDays : weeklyPlan;

    const candidates = days.flatMap((day) =>
      day.perDesigner.map((slot) => {
        const changingDesigner = slot.id !== card.designerId;
        if (changingDesigner && !canReassign) return null;

        const alreadyInSlot = slot.cards.some(
          (item) =>
            item.id === card.id && item.source === card.source
        )
          ? card.points
          : 0;
        const projected = slot.used - alreadyInSlot + card.points;
        const ratio =
          slot.capacity > 0
            ? projected / slot.capacity
            : Number.POSITIVE_INFINITY;

        return {
          designerId: slot.id,
          designerName: slot.name,
          date: day.date,
          projected,
          capacity: slot.capacity,
          ratio,
          changingDesigner
        };
      })
    ).filter(Boolean) as Array<{
      designerId: string;
      designerName: string;
      date: Date;
      projected: number;
      capacity: number;
      ratio: number;
      changingDesigner: boolean;
    }>;

    return candidates.sort((a, b) => {
      const aSame = a.designerId === card.designerId ? 0 : 1;
      const bSame = b.designerId === card.designerId ? 0 : 1;
      const aFits = a.projected <= a.capacity ? 0 : 1;
      const bFits = b.projected <= b.capacity ? 0 : 1;

      return (
        aFits - bFits ||
        aSame - bSame ||
        a.ratio - b.ratio ||
        a.date.getTime() - b.date.getTime()
      );
    })[0] ?? null;
  }

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

  function planForDesigner(
    card: OperationalKanbanCard,
    designerId: string,
    date: Date
  ) {
    if (card.column === "DONE") return;

    const target = capacityState.find((item) => item.id === designerId);
    if (!target) return;

    const changingDesigner = card.designerId !== designerId;
    if (changingDesigner && !canReassign) return;

    const currentOwner = capacityState.find(
      (item) => item.id === card.designerId
    );
    const projectedPoints = changingDesigner
      ? target.usedPoints + card.points
      : target.usedPoints;
    const projectedPercentage =
      target.capacityPoints > 0
        ? Math.round((projectedPoints / target.capacityPoints) * 100)
        : 0;

    if (
      changingDesigner &&
      projectedPoints > target.capacityPoints &&
      !window.confirm(
        `${target.name} ficará com ${projectedPoints}/${target.capacityPoints} pontos (${projectedPercentage}%). Deseja planejar mesmo assim?`
      )
    ) {
      return;
    }

    const previousCards = cards;
    const previousCapacity = capacityState;
    const plannedProductionDate = dateOnlyKey(date);
    const plannedIso = new Date(
      `${plannedProductionDate}T12:00:00.000Z`
    ).toISOString();

    setError(null);
    setCards((current) =>
      current.map((item) =>
        item.id === card.id && item.source === card.source
          ? {
              ...item,
              designerId: target.id,
              designerName: target.name,
              plannedProductionDate: plannedIso
            }
          : item
      )
    );

    if (changingDesigner) {
      setCapacityState((current) =>
        current.map((item) => {
          const delta =
            item.id === target.id
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
    }

    const planningForm = new FormData();
    planningForm.set("id", card.id);
    planningForm.set("source", card.source);
    planningForm.set("plannedProductionDate", plannedProductionDate);
    if (card.calendarId) {
      planningForm.set("calendarId", card.calendarId);
    }

    const assignmentForm = new FormData();
    assignmentForm.set("id", card.id);
    assignmentForm.set("source", card.source);
    assignmentForm.set("designerId", target.id);
    if (card.calendarId) {
      assignmentForm.set("calendarId", card.calendarId);
    }

    startTransition(async () => {
      try {
        if (changingDesigner) {
          await assignOperationalDemand(assignmentForm);
        }
        await updateOperationalPlannedDate(planningForm);
        router.refresh();
      } catch (cause) {
        setCards(previousCards);
        setCapacityState(previousCapacity);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível alterar a agenda da demanda."
        );
      }
    });
  }

  function planDate(card: OperationalKanbanCard, date: Date) {
    if (card.column === "DONE") return;

    const previous = cards;
    const plannedProductionDate = dateOnlyKey(date);
    setError(null);
    setCards((current) =>
      current.map((item) =>
        item.id === card.id && item.source === card.source
          ? {
              ...item,
              plannedProductionDate: new Date(
                `${plannedProductionDate}T12:00:00.000Z`
              ).toISOString()
            }
          : item
      )
    );

    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("source", card.source);
    formData.set("plannedProductionDate", plannedProductionDate);
    if (card.calendarId) formData.set("calendarId", card.calendarId);

    startTransition(async () => {
      try {
        await updateOperationalPlannedDate(formData);
        router.refresh();
      } catch (cause) {
        setCards(previous);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível alterar o planejamento."
        );
      }
    });
  }
  function autoResolveConflicts() {
    if (!canReassign) return;

    const load = new Map<string, number>();
    for (const day of weeklyPlan) {
      for (const slot of day.perDesigner) {
        load.set(
          `${slot.id}:${dateOnlyKey(day.date)}`,
          slot.used
        );
      }
    }

    const operations: Array<{
      id: string;
      source: "calendar" | "standalone";
      designerId?: string;
      plannedProductionDate: string;
    }> = [];
    const handled = new Set<string>();

    function choosePlacement(card: OperationalKanbanCard) {
      const candidateDays = weeklyPlan.filter((day) => {
        if (!card.dueAt) return true;
        const due = new Date(card.dueAt);
        due.setHours(23, 59, 59, 999);
        return day.date.getTime() <= due.getTime();
      });
      const days =
        candidateDays.length > 0 ? candidateDays : weeklyPlan;

      return days
        .flatMap((day) =>
          day.perDesigner.map((slot) => {
            const changingDesigner = slot.id !== card.designerId;
            const key = `${slot.id}:${dateOnlyKey(day.date)}`;
            const currentLoad = load.get(key) ?? 0;
            const sourceSlot = slot.cards.some(
              (item) =>
                item.id === card.id && item.source === card.source
            );
            const adjustedLoad = sourceSlot
              ? Math.max(0, currentLoad - card.points)
              : currentLoad;
            const projected = adjustedLoad + card.points;
            const ratio =
              slot.capacity > 0
                ? projected / slot.capacity
                : Number.POSITIVE_INFINITY;

            return {
              designerId: slot.id,
              date: day.date,
              key,
              sourceSlot,
              adjustedLoad,
              projected,
              capacity: slot.capacity,
              ratio,
              changingDesigner
            };
          })
        )
        .sort((a, b) => {
          const aFits = a.projected <= a.capacity ? 0 : 1;
          const bFits = b.projected <= b.capacity ? 0 : 1;
          const aSame = a.designerId === card.designerId ? 0 : 1;
          const bSame = b.designerId === card.designerId ? 0 : 1;
          return (
            aFits - bFits ||
            aSame - bSame ||
            a.ratio - b.ratio ||
            a.date.getTime() - b.date.getTime()
          );
        })[0] ?? null;
    }

    const alertKeys = new Set(
      operationalAlerts
        .filter(
          (alert) =>
            alert.cardKey &&
            (
              alert.title === "Planejamento vencido" ||
              alert.title === "Demanda sem responsável" ||
              alert.title === "Atrasada e sem planejamento" ||
              alert.title === "Prazo próximo sem planejamento" ||
              alert.title === "Ajuste sem replanejamento"
            )
        )
        .map((alert) => alert.cardKey as string)
    );

    const prioritized = rankedCards.filter((card) =>
      alertKeys.has(`${card.source}:${card.id}`)
    );

    for (const card of prioritized) {
      const cardKey = `${card.source}:${card.id}`;
      if (handled.has(cardKey) || card.column === "DONE") continue;

      const placement = choosePlacement(card);
      if (!placement) continue;

      for (const day of weeklyPlan) {
        for (const slot of day.perDesigner) {
          if (
            slot.cards.some(
              (item) =>
                item.id === card.id && item.source === card.source
            )
          ) {
            const oldKey = `${slot.id}:${dateOnlyKey(day.date)}`;
            load.set(
              oldKey,
              Math.max(0, (load.get(oldKey) ?? 0) - card.points)
            );
          }
        }
      }
      load.set(placement.key, placement.projected);

      operations.push({
        id: card.id,
        source: card.source,
        designerId:
          placement.designerId !== card.designerId
            ? placement.designerId
            : undefined,
        plannedProductionDate: dateOnlyKey(placement.date)
      });
      handled.add(cardKey);
    }

    for (const day of weeklyPlan) {
      for (const slot of day.perDesigner) {
        const slotKey = `${slot.id}:${dateOnlyKey(day.date)}`;
        let currentLoad = load.get(slotKey) ?? 0;

        if (currentLoad <= slot.capacity) continue;

        const movable = [...slot.cards]
          .filter((card) => card.column !== "DONE")
          .sort(
            (a, b) =>
              a.operationalScore - b.operationalScore
          );

        for (const card of movable) {
          if (currentLoad <= slot.capacity) break;
          const cardKey = `${card.source}:${card.id}`;
          if (handled.has(cardKey)) continue;

          load.set(
            slotKey,
            Math.max(0, currentLoad - card.points)
          );
          const placement = choosePlacement(card);

          if (
            !placement ||
            (
              placement.designerId === slot.id &&
              dateOnlyKey(placement.date) === dateOnlyKey(day.date)
            )
          ) {
            load.set(slotKey, currentLoad);
            continue;
          }

          load.set(placement.key, placement.projected);
          currentLoad = Math.max(0, currentLoad - card.points);

          operations.push({
            id: card.id,
            source: card.source,
            designerId:
              placement.designerId !== card.designerId
                ? placement.designerId
                : undefined,
            plannedProductionDate: dateOnlyKey(placement.date)
          });
          handled.add(cardKey);
        }
      }
    }

    if (operations.length === 0) {
      setError("Não há conflitos com solução automática disponível.");
      return;
    }

    const formData = new FormData();
    formData.set("operations", JSON.stringify(operations));
    setError(null);

    startTransition(async () => {
      try {
        await resolveOperationalConflicts(formData);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível resolver os conflitos automaticamente."
        );
      }
    });
  }


  return (
    <section className="operational-kanban-wrap">
      <div className="kanban-command-bar">
        <div className="kanban-command-copy">
          <strong>Central operacional</strong>
          <span>
            Acompanhe a fila, planeje a semana e distribua a capacidade sem
            misturar todas as visões na mesma tela.
          </span>
        </div>

        <div className="kanban-view-tabs" role="tablist" aria-label="Visão da central">
          <button
            type="button"
            className={view === "kanban" ? "active" : ""}
            onClick={() => setView("kanban")}
          >
            Fila
          </button>
          <button
            type="button"
            className={view === "planning" ? "active" : ""}
            onClick={() => setView("planning")}
          >
            Planejamento
          </button>
          <button
            type="button"
            className={view === "capacity" ? "active" : ""}
            onClick={() => setView("capacity")}
          >
            Capacidade
          </button>
        </div>

        <div className="kanban-command-status">
          {alertSummary.critical > 0 ? (
            <span className="critical">
              {alertSummary.critical} crítico(s)
            </span>
          ) : null}
          <span>{cards.filter((card) => card.column !== "DONE").length} ativas</span>
          {isPending ? <em>Salvando...</em> : null}
        </div>
      </div>

      <div
        className={
          alertSummary.critical > 0
            ? "kanban-operational-alerts has-critical"
            : alertSummary.warning > 0
              ? "kanban-operational-alerts has-warning"
              : "kanban-operational-alerts is-clear"
        }
      >
        <div className="kanban-alerts-head">
          <div>
            <strong>Alertas operacionais</strong>
            <span>
              Pendências detectadas automaticamente a partir de prazo,
              planejamento e capacidade.
            </span>
          </div>
          <div className="kanban-alerts-summary">
            {canReassign && operationalAlerts.length > 0 ? (
              <button
                className="kanban-alerts-auto"
                type="button"
                disabled={isPending}
                onClick={autoResolveConflicts}
              >
                Resolver conflitos
              </button>
            ) : null}
            <span className="critical">
              {alertSummary.critical} crítico(s)
            </span>
            <span className="warning">
              {alertSummary.warning} atenção
            </span>
          </div>
        </div>

        {operationalAlerts.length === 0 ? (
          <div className="kanban-alerts-clear">
            <FiCheckCircle aria-hidden="true" />
            <span>
              <strong>Operação sem alertas.</strong>
              <small>
                Nenhuma demanda atrasada, sem planejamento ou com sobrecarga
                detectada.
              </small>
            </span>
          </div>
        ) : (
          <div className="kanban-alerts-list">
            {operationalAlerts.slice(0, 4).map((alert) => (
              <article
                className={`kanban-alert-item ${alert.severity}`}
                key={alert.id}
              >
                <FiAlertCircle aria-hidden="true" />
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </div>
                <div className="kanban-alert-actions">
                  {alert.cardKey ? (() => {
                    const [source, id] = alert.cardKey.split(":");
                    const card = cards.find(
                      (item) => item.source === source && item.id === id
                    );
                    const placement = card
                      ? recommendedPlacementFor(card)
                      : null;

                    return card && placement ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          planForDesigner(
                            card,
                            placement.designerId,
                            placement.date
                          )
                        }
                      >
                        Replanejar → {placement.designerName}{" "}
                        {shortWeekday(placement.date)}
                      </button>
                    ) : null;
                  })() : null}
                  {alert.href ? (
                    <Link href={alert.href}>Abrir</Link>
                  ) : null}
                </div>
              </article>
            ))}
            {operationalAlerts.length > 4 ? (
              <small className="kanban-alerts-more">
                +{operationalAlerts.length - 4} alerta(s) adicional(is)
              </small>
            ) : null}
          </div>
        )}
      </div>

      {view === "capacity" ? (
        <div className="kanban-view-stack">
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

          {plannedVsDone.length > 0 ? (
            <div className="kanban-performance-panel">
              <div className="kanban-performance-head">
                <div>
                  <strong>Planejado x realizado · semana atual</strong>
                  <span>
                    Pontos planejados para produção comparados aos pontos concluídos.
                  </span>
                </div>
              </div>
              <div className="kanban-performance-grid">
                {plannedVsDone.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.completedPoints}/{item.plannedPoints} pts
                      </span>
                    </div>
                    <div className="kanban-performance-track">
                      <i
                        style={{
                          width: `${Math.min(item.percentage, 100)}%`
                        }}
                      />
                    </div>
                    <small>
                      {item.plannedPoints === 0
                        ? "Sem produção planejada"
                        : `${item.percentage}% realizado`}
                    </small>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      ) : null}

      {view === "planning" ? (
        <div className="kanban-view-stack">
          {weeklyPlan.length > 0 && capacityState.length > 0 ? (
            <div className="kanban-designer-agenda">
              <div className="kanban-agenda-head">
                <div>
                  <strong>Agenda por designer</strong>
                  <span>
                    Matriz designer × dia. Arraste uma demanda para outro dia ou
                    outro designer para atualizar o planejamento.
                  </span>
                </div>
                <small>Alterações são salvas automaticamente</small>
              </div>

              <div className="kanban-agenda-scroll">
                <div className="kanban-agenda-grid">
                  <div className="kanban-agenda-corner">
                    <span>Designer</span>
                  </div>

                  {weeklyPlan.map((day) => (
                    <div
                      className="kanban-agenda-day-head"
                      key={`agenda-head-${day.date.toISOString()}`}
                    >
                      <strong>{shortWeekday(day.date)}</strong>
                      <span>{shortDate(day.date)}</span>
                    </div>
                  ))}

                  {capacityState.map((designer) => (
                    <Fragment key={`agenda-row-${designer.id}`}>
                      <div
                        className="kanban-agenda-designer"
                        key={`agenda-designer-${designer.id}`}
                      >
                        <div>
                          <FiUser aria-hidden="true" />
                          <span>
                            <strong>{designer.name}</strong>
                            <small>
                              {designer.usedPoints}/{designer.capacityPoints} pts
                            </small>
                          </span>
                        </div>
                      </div>

                      {weeklyPlan.map((day) => {
                        const slot = day.perDesigner.find(
                          (item) => item.id === designer.id
                        );
                        const used = slot?.used ?? 0;
                        const capacity = slot?.capacity ?? designer.capacityPoints / 5;
                        const percentage =
                          capacity > 0
                            ? Math.round((used / capacity) * 100)
                            : 0;
                        const slotCards = slot?.cards ?? [];

                        return (
                          <div
                            className={
                              percentage > 100
                                ? "kanban-agenda-cell overloaded"
                                : percentage >= 85
                                  ? "kanban-agenda-cell warning"
                                  : "kanban-agenda-cell"
                            }
                            key={`agenda-${designer.id}-${day.date.toISOString()}`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              const [source, id] = event.dataTransfer
                                .getData("text/plain")
                                .split(":");
                              const card = cards.find(
                                (item) =>
                                  item.id === id && item.source === source
                              );
                              if (card) {
                                planForDesigner(card, designer.id, day.date);
                              }
                            }}
                          >
                            <div className="kanban-agenda-cell-head">
                              <span>
                                {Math.round(used * 10) / 10}/
                                {Math.round(capacity * 10) / 10} pts
                              </span>
                              <em>{percentage}%</em>
                            </div>

                            <div className="kanban-agenda-cell-track">
                              <i
                                style={{
                                  width: `${Math.min(percentage, 100)}%`
                                }}
                              />
                            </div>

                            <div className="kanban-agenda-items">
                              {slotCards.length === 0 ? (
                                <small>Livre</small>
                              ) : (
                                slotCards.map((card) => (
                                  <Link
                                    href={card.href}
                                    className={
                                      card.plannedProductionDate
                                        ? "kanban-agenda-item fixed"
                                        : "kanban-agenda-item suggested"
                                    }
                                    draggable={
                                      card.column !== "DONE" && !isPending
                                    }
                                    key={`agenda-card-${designer.id}-${day.date.toISOString()}-${card.source}-${card.id}`}
                                    onDragStart={(event) => {
                                      event.dataTransfer.setData(
                                        "text/plain",
                                        `${card.source}:${card.id}`
                                      );
                                      event.dataTransfer.effectAllowed = "move";
                                    }}
                                    onClick={(event) => {
                                      if (isPending) event.preventDefault();
                                    }}
                                  >
                                    <strong>{card.title}</strong>
                                    <span>
                                      {card.points} pts ·{" "}
                                      {card.plannedProductionDate
                                        ? "fixado"
                                        : "sugerido"}
                                    </span>
                                  </Link>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
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
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const [source, id] = event.dataTransfer
                        .getData("text/plain")
                        .split(":");
                      const card = cards.find(
                        (item) =>
                          item.id === id && item.source === source
                      );
                      if (card) planDate(card, day.date);
                    }}
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
                            draggable={card.column !== "DONE" && !isPending}
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                `${card.source}:${card.id}`
                              );
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={(event) => {
                              if (isPending) event.preventDefault();
                            }}
                          >
                            <span>
                              <strong>{card.title}</strong>
                              <small>
                                {card.designerName} · {card.points} pts
                                {card.plannedProductionDate
                                  ? " · fixado"
                                  : " · sugerido"}
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

        </div>
      ) : null}

      {view === "kanban" ? (
        <div className="kanban-view-stack">
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

        </div>
      ) : null}

      {error ? (
        <div className="kanban-error" role="alert">
          <FiAlertCircle aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {view === "kanban" ? (
        <>
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
        </>
      ) : null}

    </section>
  );
}

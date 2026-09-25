import {
  ApprovalPhase,
  CalendarStage,
  Channel,
  CommentAuthorType,
  ContentStage,
  ContentStatus,
  ContentType,
  NotificationType,
  PrismaClient,
  ReviewAction,
  UserRole
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function utcDate(year: number, monthIndex: number, day: number, hour = 15) {
  return new Date(Date.UTC(year, monthIndex, day, hour, 0, 0));
}

function daysFromNow(days: number, hour = 15) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function monthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  return {
    year,
    monthIndex,
    start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59))
  };
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  weeklyCapacityPoints?: number;
}) {
  return prisma.designer.upsert({
    where: { email: input.email.trim().toLowerCase() },
    update: {
      name: input.name.trim(),
      role: input.role,
      active: true,
      mustChangePassword: false,
      passwordHash: hashPassword(input.password),
      weeklyCapacityPoints: input.weeklyCapacityPoints ?? 30
    },
    create: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      active: true,
      mustChangePassword: false,
      passwordHash: hashPassword(input.password),
      weeklyCapacityPoints: input.weeklyCapacityPoints ?? 30
    }
  });
}

async function upsertClient(input: {
  slug: string;
  name: string;
  niche: string;
  phone: string;
  designerId: string;
  email: string;
  password: string;
  region: string;
  weekdays: number[];
  toneOfVoice: string;
  targetAudience: string;
  services: string;
  objectives: string;
  hashtags: string;
}) {
  const client = await prisma.client.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      niche: input.niche,
      phone: input.phone,
      assignedDesignerId: input.designerId,
      active: true,
      region: input.region,
      toneOfVoice: input.toneOfVoice,
      targetAudience: input.targetAudience,
      services: input.services,
      objectives: input.objectives,
      hashtags: input.hashtags
    },
    create: {
      name: input.name,
      slug: input.slug,
      niche: input.niche,
      phone: input.phone,
      assignedDesignerId: input.designerId,
      active: true,
      region: input.region,
      toneOfVoice: input.toneOfVoice,
      targetAudience: input.targetAudience,
      services: input.services,
      objectives: input.objectives,
      hashtags: input.hashtags
    }
  });

  await prisma.clientPostingWeekday.deleteMany({
    where: { clientId: client.id }
  });

  await prisma.clientPostingWeekday.createMany({
    data: input.weekdays.map((weekday) => ({
      clientId: client.id,
      weekday
    }))
  });

  await prisma.clientCredential.upsert({
    where: { clientId: client.id },
    update: {
      email: input.email,
      passwordHash: hashPassword(input.password)
    },
    create: {
      clientId: client.id,
      email: input.email,
      passwordHash: hashPassword(input.password)
    }
  });

  return client;
}

async function resetCalendar(input: {
  shareToken: string;
  clientId: string;
  title: string;
  stage: CalendarStage;
  postingDays: number[];
  planningDueAt?: Date | null;
  planningApprovalDueAt?: Date | null;
  artworkDueAt?: Date | null;
  artworkApprovalDueAt?: Date | null;
  schedulingDueAt?: Date | null;
}) {
  const { year, monthIndex, start, end } = monthRange();

  const calendar = await prisma.calendar.upsert({
    where: { shareToken: input.shareToken },
    update: {
      clientId: input.clientId,
      title: input.title,
      stage: input.stage,
      periodStart: start,
      periodEnd: end,
      archivedAt: null,
      planningDueAt: input.planningDueAt ?? null,
      planningApprovalDueAt: input.planningApprovalDueAt ?? null,
      artworkDueAt: input.artworkDueAt ?? null,
      artworkApprovalDueAt: input.artworkApprovalDueAt ?? null,
      schedulingDueAt: input.schedulingDueAt ?? null,
      shareExpiresAt: daysFromNow(45)
    },
    create: {
      clientId: input.clientId,
      title: input.title,
      stage: input.stage,
      periodStart: start,
      periodEnd: end,
      shareToken: input.shareToken,
      planningDueAt: input.planningDueAt ?? null,
      planningApprovalDueAt: input.planningApprovalDueAt ?? null,
      artworkDueAt: input.artworkDueAt ?? null,
      artworkApprovalDueAt: input.artworkApprovalDueAt ?? null,
      schedulingDueAt: input.schedulingDueAt ?? null,
      shareExpiresAt: daysFromNow(45)
    }
  });

  await prisma.contentItem.deleteMany({
    where: { calendarId: calendar.id }
  });

  await prisma.calendarPostingDay.deleteMany({
    where: { calendarId: calendar.id }
  });

  await prisma.calendarPostingDay.createMany({
    data: input.postingDays.map((day) => ({
      calendarId: calendar.id,
      scheduledDate: utcDate(year, monthIndex, day, 12)
    }))
  });

  return calendar;
}

async function createItem(input: {
  calendarId: string;
  day: number;
  title: string;
  theme: string;
  headline: string;
  caption: string;
  stage: ContentStage;
  status: ContentStatus;
  contentType?: ContentType;
  assetUrl?: string | null;
  metrics?: {
    reach?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
  sortOrder: number;
}) {
  const { year, monthIndex } = monthRange();
  const type = input.contentType ?? ContentType.POST;
  const effortPoints =
    type === ContentType.REEL ? 3 : type === ContentType.CAROUSEL ? 2 : 1;

  return prisma.contentItem.create({
    data: {
      calendarId: input.calendarId,
      title: input.title,
      theme: input.theme,
      headline: input.headline,
      subheadline: "Conteúdo fictício para visualizar o fluxo completo.",
      designerNotes: "Dados gerados pelo seed de demonstração.",
      scheduledAt: utcDate(year, monthIndex, input.day, 15),
      channel: Channel.INSTAGRAM,
      contentType: type,
      effortPoints,
      format:
        type === ContentType.REEL
          ? "Reels · 1080x1920"
          : type === ContentType.CAROUSEL
            ? "Carrossel vertical · 1080x1350"
            : "Post vertical · 1080x1350",
      publishToFeed: true,
      publishToStories: type === ContentType.REEL,
      caption: input.caption,
      assetUrl: input.assetUrl ?? null,
      status: input.status,
      stage: input.stage,
      planningReady: true,
      artworkVersion: input.assetUrl ? 2 : 0,
      sortOrder: input.sortOrder,
      reviewedAt:
        input.status === ContentStatus.PENDING_APPROVAL ? null : daysFromNow(-2),
      planningApprovedAt:
        [
          ContentStage.DESIGN_PENDING,
          ContentStage.DESIGN_IN_PROGRESS,
          ContentStage.ART_APPROVAL_PENDING,
          ContentStage.ART_CHANGES_REQUESTED,
          ContentStage.ART_APPROVED,
          ContentStage.READY_TO_SCHEDULE,
          ContentStage.SCHEDULED,
          ContentStage.PUBLISHED,
          ContentStage.SCHEDULING_ERROR
        ].includes(input.stage)
          ? daysFromNow(-8)
          : null,
      artworkApprovedAt:
        [
          ContentStage.ART_APPROVED,
          ContentStage.READY_TO_SCHEDULE,
          ContentStage.SCHEDULED,
          ContentStage.PUBLISHED,
          ContentStage.SCHEDULING_ERROR
        ].includes(input.stage)
          ? daysFromNow(-3)
          : null,
      publishedAt:
        input.stage === ContentStage.PUBLISHED ? daysFromNow(-2) : null,
      metricReach: input.metrics?.reach ?? null,
      metricImpressions: input.metrics?.impressions ?? null,
      metricLikes: input.metrics?.likes ?? null,
      metricComments: input.metrics?.comments ?? null,
      metricShares: input.metrics?.shares ?? null,
      metricSaves: input.metrics?.saves ?? null,
      metricsUpdatedAt: input.metrics ? new Date() : null
    }
  });
}

async function main() {
  const dev = await upsertUser({
    name:
      process.env.DEV_NAME?.trim() ||
      process.env.DESIGNER_NAME?.trim() ||
      "Dev Terceiro Andar",
    email:
      process.env.DEV_EMAIL?.trim() ||
      process.env.DESIGNER_EMAIL?.trim() ||
      "designer@dev.com",
    password:
      process.env.DEV_PASSWORD ||
      process.env.DESIGNER_PASSWORD ||
      "senha123",
    role: UserRole.DEV,
    weeklyCapacityPoints: 40
  });

  const admin = await upsertUser({
    name: "Camila Andrade",
    email: "admin@dev.com",
    password: "senha123",
    role: UserRole.ADMIN,
    weeklyCapacityPoints: 40
  });

  const julia = await upsertUser({
    name: "Júlia Mendes",
    email: "julia@dev.com",
    password: "senha123",
    role: UserRole.DESIGNER,
    weeklyCapacityPoints: 26
  });

  const rafael = await upsertUser({
    name: "Rafael Costa",
    email: "rafael@dev.com",
    password: "senha123",
    role: UserRole.DESIGNER,
    weeklyCapacityPoints: 30
  });

  const marina = await upsertUser({
    name: "Marina Lopes",
    email: "marina@dev.com",
    password: "senha123",
    role: UserRole.DESIGNER,
    weeklyCapacityPoints: 22
  });

  const formats = [
    ["Post vertical", ContentType.POST, 1080, 1350, true, true],
    ["Post quadrado", ContentType.POST, 1080, 1080, true, true],
    ["Carrossel vertical", ContentType.CAROUSEL, 1080, 1350, true, true],
    ["Reels / vídeo vertical", ContentType.REEL, 1080, 1920, true, true],
    ["Stories", ContentType.STORY, 1080, 1920, false, true]
  ] as const;

  for (const [name, contentType, width, height, supportsFeed, supportsStories] of formats) {
    const existing = await prisma.contentFormat.findFirst({ where: { name } });

    if (existing) {
      await prisma.contentFormat.update({
        where: { id: existing.id },
        data: {
          contentType,
          width,
          height,
          supportsFeed,
          supportsStories,
          active: true
        }
      });
    } else {
      await prisma.contentFormat.create({
        data: {
          name,
          contentType,
          width,
          height,
          supportsFeed,
          supportsStories,
          active: true
        }
      });
    }
  }

  const abm = await upsertClient({
    slug: "demo-abm-telecom",
    name: "ABM Telecom",
    niche: "Telecomunicações",
    phone: "(22) 99911-2233",
    designerId: julia.id,
    email: "abm@demo.local",
    password: "senha123",
    region: "Região dos Lagos",
    weekdays: [1, 3, 5],
    toneOfVoice: "Próximo, ágil e confiante. Evitar excesso de termos técnicos.",
    targetAudience: "Famílias e empresas que precisam de internet estável.",
    services: "Internet fibra, planos empresariais e Wi-Fi residencial.",
    objectives: "Reforçar estabilidade, suporte local e geração de leads.",
    hashtags: "#internet #fibra #regiaodoslagos"
  });

  const vetmais = await upsertClient({
    slug: "demo-vetmais",
    name: "VetMais Clínica Veterinária",
    niche: "Veterinária",
    phone: "(22) 99888-4422",
    designerId: rafael.id,
    email: "vetmais@demo.local",
    password: "senha123",
    region: "São Pedro da Aldeia",
    weekdays: [2, 4],
    toneOfVoice: "Acolhedor, educativo e responsável.",
    targetAudience: "Tutores de cães e gatos da Região dos Lagos.",
    services: "Consultas, vacinas, exames, internação e cirurgia.",
    objectives: "Educação preventiva e aumento de agendamentos.",
    hashtags: "#vet #pet #saudeanimal"
  });

  const costa = await upsertClient({
    slug: "demo-costa-azul-imoveis",
    name: "Costa Azul Imóveis",
    niche: "Imobiliário",
    phone: "(22) 99777-5511",
    designerId: julia.id,
    email: "costaazul@demo.local",
    password: "senha123",
    region: "Cabo Frio",
    weekdays: [1, 3, 5],
    toneOfVoice: "Elegante, objetivo e consultivo.",
    targetAudience: "Compradores, investidores e proprietários.",
    services: "Compra, venda, locação e avaliação de imóveis.",
    objectives: "Gerar oportunidades e reforçar autoridade regional.",
    hashtags: "#imoveis #cabofrio #regiaodoslagos"
  });

  const sabor = await upsertClient({
    slug: "demo-sabor-da-vila",
    name: "Sabor da Vila",
    niche: "Gastronomia",
    phone: "(22) 99666-8877",
    designerId: marina.id,
    email: "sabordavila@demo.local",
    password: "senha123",
    region: "Arraial do Cabo",
    weekdays: [2, 4, 6],
    toneOfVoice: "Leve, apetitoso e descontraído.",
    targetAudience: "Moradores, turistas e famílias.",
    services: "Almoço, jantar, delivery e eventos.",
    objectives: "Aumentar fluxo no salão e pedidos no delivery.",
    hashtags: "#gastronomia #arraialdocabo #delivery"
  });

  const studio = await upsertClient({
    slug: "demo-studio-move",
    name: "Studio Move",
    niche: "Fitness",
    phone: "(22) 99555-9900",
    designerId: rafael.id,
    email: "studiomove@demo.local",
    password: "senha123",
    region: "Cabo Frio",
    weekdays: [1, 3, 5],
    toneOfVoice: "Motivador, humano e sem promessas milagrosas.",
    targetAudience: "Adultos que buscam condicionamento e qualidade de vida.",
    services: "Treinamento funcional, personal e avaliação física.",
    objectives: "Gerar experimentais e retenção de alunos.",
    hashtags: "#fitness #treino #cabofrio"
  });

  const productionCalendar = await resetCalendar({
    shareToken: "demo-abm-producao",
    clientId: abm.id,
    title: "ABM · Conteúdo do mês",
    stage: CalendarStage.PRODUCTION,
    postingDays: [4, 8, 12, 16, 20, 24, 28],
    artworkDueAt: daysFromNow(1),
    artworkApprovalDueAt: daysFromNow(4),
    schedulingDueAt: daysFromNow(7)
  });

  await createItem({
    calendarId: productionCalendar.id,
    day: 20,
    title: "Internet sem travar no home office",
    theme: "Produtividade",
    headline: "Sua reunião não pode depender da sorte",
    caption: "Conexão estável para trabalhar, estudar e atender sem interrupções.",
    stage: ContentStage.DESIGN_PENDING,
    status: ContentStatus.DRAFT,
    sortOrder: 1
  });

  await createItem({
    calendarId: productionCalendar.id,
    day: 24,
    title: "3 sinais de que o Wi-Fi precisa de atenção",
    theme: "Educação",
    headline: "Seu Wi-Fi está pedindo ajuda?",
    caption: "Três sinais simples para identificar gargalos de conexão dentro de casa.",
    stage: ContentStage.DESIGN_IN_PROGRESS,
    status: ContentStatus.DRAFT,
    contentType: ContentType.CAROUSEL,
    sortOrder: 2
  });

  const prod3 = await createItem({
    calendarId: productionCalendar.id,
    day: 28,
    title: "Plano empresarial",
    theme: "Comercial",
    headline: "Conectividade para o seu negócio crescer",
    caption: "Atendimento local, estabilidade e planos pensados para empresas.",
    stage: ContentStage.ART_CHANGES_REQUESTED,
    status: ContentStatus.CHANGES_REQUESTED,
    contentType: ContentType.REEL,
    assetUrl: "/demo/abm-plano.svg",
    sortOrder: 3
  });

  await prisma.contentComment.create({
    data: {
      contentItemId: prod3.id,
      authorType: CommentAuthorType.CLIENT,
      authorName: "Cliente ABM",
      message: "Vamos destacar mais o suporte local e reduzir o texto do segundo bloco.",
      visibleToClient: true
    }
  });

  const planningCalendar = await resetCalendar({
    shareToken: "demo-vetmais-aprovacao",
    clientId: vetmais.id,
    title: "VetMais · Pré-calendário",
    stage: CalendarStage.PRE_APPROVAL,
    postingDays: [5, 10, 15, 20, 25],
    planningApprovalDueAt: daysFromNow(-2),
    artworkDueAt: daysFromNow(4),
    artworkApprovalDueAt: daysFromNow(7)
  });

  await createItem({
    calendarId: planningCalendar.id,
    day: 15,
    title: "Vacinação em dia",
    theme: "Prevenção",
    headline: "A carteirinha do seu pet está atualizada?",
    caption: "Vacinação também é cuidado preventivo e tranquilidade para toda a família.",
    stage: ContentStage.PRE_APPROVAL_PENDING,
    status: ContentStatus.PENDING_APPROVAL,
    sortOrder: 1
  });

  const plan2 = await createItem({
    calendarId: planningCalendar.id,
    day: 20,
    title: "Sinais de dor em gatos",
    theme: "Educação",
    headline: "Gatos escondem a dor. Você sabe reconhecer?",
    caption: "Alguns sinais são discretos. Observe mudanças de comportamento e procure orientação.",
    stage: ContentStage.PRE_CHANGES_REQUESTED,
    status: ContentStatus.CHANGES_REQUESTED,
    contentType: ContentType.CAROUSEL,
    sortOrder: 2
  });

  await prisma.reviewHistory.create({
    data: {
      contentItemId: plan2.id,
      action: ReviewAction.CHANGES_REQUESTED,
      phase: ApprovalPhase.PLANNING,
      message: "Trocar o segundo slide por um exemplo mais simples.",
      reviewerName: "Dra. Fernanda"
    }
  });

  const finalCalendar = await resetCalendar({
    shareToken: "demo-costa-aprovacao-final",
    clientId: costa.id,
    title: "Costa Azul · Aprovação final",
    stage: CalendarStage.FINAL_APPROVAL,
    postingDays: [6, 13, 20, 27],
    artworkApprovalDueAt: daysFromNow(1),
    schedulingDueAt: daysFromNow(3)
  });

  await createItem({
    calendarId: finalCalendar.id,
    day: 20,
    title: "Apartamento com vista para o mar",
    theme: "Imóvel em destaque",
    headline: "Morar perto do mar muda a rotina",
    caption: "Um imóvel pensado para quem valoriza localização, conforto e praticidade.",
    stage: ContentStage.ART_APPROVAL_PENDING,
    status: ContentStatus.PENDING_APPROVAL,
    assetUrl: "/demo/costa-azul.svg",
    sortOrder: 1
  });

  const art2 = await createItem({
    calendarId: finalCalendar.id,
    day: 27,
    title: "Guia para comprar seu primeiro imóvel",
    theme: "Educação",
    headline: "Seu primeiro imóvel começa com boas perguntas",
    caption: "Organize orçamento, prioridades e documentação antes de escolher.",
    stage: ContentStage.ART_APPROVED,
    status: ContentStatus.APPROVED,
    contentType: ContentType.CAROUSEL,
    assetUrl: "/demo/costa-guia.svg",
    sortOrder: 2
  });

  await prisma.reviewHistory.create({
    data: {
      contentItemId: art2.id,
      action: ReviewAction.APPROVED,
      phase: ApprovalPhase.ARTWORK,
      reviewerName: "Marcos · Costa Azul"
    }
  });

  const schedulingCalendar = await resetCalendar({
    shareToken: "demo-sabor-programacao",
    clientId: sabor.id,
    title: "Sabor da Vila · Programação",
    stage: CalendarStage.SCHEDULING,
    postingDays: [7, 14, 21, 28],
    schedulingDueAt: daysFromNow(-1)
  });

  await createItem({
    calendarId: schedulingCalendar.id,
    day: 21,
    title: "Prato executivo da semana",
    theme: "Produto",
    headline: "Almoço gostoso sem complicação",
    caption: "Confira o prato executivo da semana e peça pelo nosso delivery.",
    stage: ContentStage.READY_TO_SCHEDULE,
    status: ContentStatus.APPROVED,
    assetUrl: "/demo/sabor-vila.svg",
    sortOrder: 1
  });

  await createItem({
    calendarId: schedulingCalendar.id,
    day: 28,
    title: "Bastidores da cozinha",
    theme: "Bastidores",
    headline: "O cuidado começa antes do prato chegar à mesa",
    caption: "Um pouco da rotina da nossa cozinha antes do serviço começar.",
    stage: ContentStage.SCHEDULING_ERROR,
    status: ContentStatus.APPROVED,
    contentType: ContentType.REEL,
    assetUrl: "/demo/sabor-bastidores.svg",
    sortOrder: 2
  });

  const completedCalendar = await resetCalendar({
    shareToken: "demo-studio-publicado",
    clientId: studio.id,
    title: "Studio Move · Publicado",
    stage: CalendarStage.COMPLETED,
    postingDays: [3, 10, 17]
  });

  await createItem({
    calendarId: completedCalendar.id,
    day: 3,
    title: "Treino para começar sem medo",
    theme: "Aquisição",
    headline: "Você não precisa estar em forma para começar",
    caption: "Comece no seu ritmo e evolua com acompanhamento.",
    stage: ContentStage.PUBLISHED,
    status: ContentStatus.APPROVED,
    contentType: ContentType.REEL,
    assetUrl: "/demo/studio-move.svg",
    metrics: {
      reach: 8420,
      impressions: 11680,
      likes: 532,
      comments: 41,
      shares: 76,
      saves: 118
    },
    sortOrder: 1
  });

  await prisma.notification.deleteMany({
    where: {
      designerId: {
        in: [julia.id, rafael.id, marina.id, admin.id, dev.id]
      },
      title: {
        startsWith: "[DEMO]"
      }
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        designerId: julia.id,
        type: NotificationType.ACTION,
        title: "[DEMO] Pré-calendário aprovado",
        message: "ABM Telecom está liberado para produção de artes.",
        link: `/calendars/${productionCalendar.id}`
      },
      {
        designerId: julia.id,
        type: NotificationType.CHANGE,
        title: "[DEMO] Alteração solicitada",
        message: "O cliente pediu ajuste no conteúdo Plano empresarial.",
        link: `/calendars/${productionCalendar.id}/content/${prod3.id}`
      },
      {
        designerId: rafael.id,
        type: NotificationType.DEADLINE,
        title: "[DEMO] Aprovação atrasada",
        message: "VetMais está com aprovação do planejamento fora do prazo.",
        link: `/calendars/${planningCalendar.id}`
      },
      {
        designerId: admin.id,
        type: NotificationType.PUBLISHING,
        title: "[DEMO] Programação pendente",
        message: "Sabor da Vila possui conteúdo pronto para programar.",
        link: `/calendars/${schedulingCalendar.id}`
      }
    ]
  });

  await prisma.auditLog.deleteMany({
    where: {
      action: {
        startsWith: "DEMO_"
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorDesignerId: admin.id,
        actorName: admin.name,
        action: "DEMO_CALENDAR_SENT",
        entityType: "Calendar",
        entityId: planningCalendar.id,
        summary: "Pré-calendário da VetMais enviado para aprovação."
      },
      {
        actorDesignerId: julia.id,
        actorName: julia.name,
        action: "DEMO_ARTWORK_UPDATED",
        entityType: "ContentItem",
        entityId: prod3.id,
        summary: "Nova versão da arte de Plano empresarial enviada."
      },
      {
        actorName: "Marcos · Costa Azul",
        action: "DEMO_PUBLIC_APPROVAL",
        entityType: "ContentItem",
        entityId: art2.id,
        summary: "Cliente aprovou a arte do Guia para comprar seu primeiro imóvel."
      }
    ]
  });

  console.log("");
  console.log("✓ Dados fictícios de demonstração criados.");
  console.log("");
  console.log("Acessos internos:");
  console.log(`DEV      ${dev.email} / senha123`);
  console.log(`ADMIN    ${admin.email} / senha123`);
  console.log(`DESIGNER ${julia.email} / senha123`);
  console.log(`DESIGNER ${rafael.email} / senha123`);
  console.log(`DESIGNER ${marina.email} / senha123`);
  console.log("");
  console.log("Clientes demo: senha123");
  console.log("abm@demo.local · vetmais@demo.local · costaazul@demo.local");
  console.log("sabordavila@demo.local · studiomove@demo.local");
  console.log("");
  console.log("Links públicos:");
  console.log("http://localhost:4334/p/demo-vetmais-aprovacao");
  console.log("http://localhost:4334/p/demo-costa-aprovacao-final");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

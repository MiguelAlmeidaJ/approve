import {
  Channel,
  ContentStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  return prisma.designer.upsert({
    where: { email: input.email.trim().toLowerCase() },
    update: {
      name: input.name.trim(),
      role: input.role,
      passwordHash: hashPassword(input.password)
    },
    create: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash: hashPassword(input.password)
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
    role: UserRole.DEV
  });

  const admin = await upsertUser({
    name: process.env.ADMIN_NAME?.trim() || "Admin Terceiro Andar",
    email: process.env.ADMIN_EMAIL?.trim() || "admin@dev.com",
    password: process.env.ADMIN_PASSWORD || "senha123",
    role: UserRole.ADMIN
  });

  const designer = await upsertUser({
    name: process.env.STAFF_DESIGNER_NAME?.trim() || "Designer Demo",
    email: process.env.STAFF_DESIGNER_EMAIL?.trim() || "social@dev.com",
    password: process.env.STAFF_DESIGNER_PASSWORD || "senha123",
    role: UserRole.DESIGNER
  });

  const formatSeeds = [
    {
      name: "Post vertical",
      contentType: "POST" as const,
      width: 1080,
      height: 1350,
      supportsFeed: true,
      supportsStories: true
    },
    {
      name: "Post quadrado",
      contentType: "POST" as const,
      width: 1080,
      height: 1080,
      supportsFeed: true,
      supportsStories: true
    },
    {
      name: "Carrossel vertical",
      contentType: "CAROUSEL" as const,
      width: 1080,
      height: 1350,
      supportsFeed: true,
      supportsStories: false
    },
    {
      name: "Reels / vídeo vertical",
      contentType: "REEL" as const,
      width: 1080,
      height: 1920,
      supportsFeed: true,
      supportsStories: true
    },
    {
      name: "Stories",
      contentType: "STORY" as const,
      width: 1080,
      height: 1920,
      supportsFeed: false,
      supportsStories: true
    }
  ];

  for (const format of formatSeeds) {
    const existingFormat = await prisma.contentFormat.findFirst({
      where: { name: format.name }
    });

    if (existingFormat) {
      await prisma.contentFormat.update({
        where: { id: existingFormat.id },
        data: {
          ...format,
          active: true
        }
      });
    } else {
      await prisma.contentFormat.create({
        data: {
          ...format,
          active: true
        }
      });
    }
  }

  const client = await prisma.client.upsert({
    where: { slug: "cliente-demo" },
    update: {
      name: "Cliente Demo",
      niche: "Marketing e comunicação",
      phone: "(22) 99999-9999",
      assignedDesignerId: designer.id
    },
    create: {
      name: "Cliente Demo",
      slug: "cliente-demo",
      niche: "Marketing e comunicação",
      phone: "(22) 99999-9999",
      assignedDesignerId: designer.id
    }
  });

  await prisma.clientCredential.upsert({
    where: { clientId: client.id },
    update: {
      email: "cliente@dev.com",
      passwordHash: hashPassword("senha123")
    },
    create: {
      clientId: client.id,
      email: "cliente@dev.com",
      passwordHash: hashPassword("senha123")
    }
  });

  const calendar = await prisma.calendar.upsert({
    where: { shareToken: "demo-terceiro-andar" },
    update: {
      clientId: client.id,
      title: "Outubro 2026",
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-31T23:59:59.000Z")
    },
    create: {
      clientId: client.id,
      title: "Outubro 2026",
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-31T23:59:59.000Z"),
      shareToken: "demo-terceiro-andar"
    }
  });

  await prisma.reviewHistory.deleteMany({
    where: { contentItem: { calendarId: calendar.id } }
  });
  await prisma.contentItem.deleteMany({
    where: { calendarId: calendar.id }
  });

  await prisma.contentItem.createMany({
    data: [
      {
        calendarId: calendar.id,
        title: "Posicionamento da marca",
        scheduledAt: new Date("2026-10-05T15:00:00.000Z"),
        channel: Channel.INSTAGRAM,
        format: "Feed 1080x1350",
        caption:
          "Uma legenda exemplo pronta para o cliente revisar e aprovar.",
        status: ContentStatus.PENDING_APPROVAL,
        sortOrder: 1
      },
      {
        calendarId: calendar.id,
        title: "Bastidores da equipe",
        scheduledAt: new Date("2026-10-09T18:00:00.000Z"),
        channel: Channel.STORIES,
        format: "Stories 1080x1920",
        caption:
          "Sequência de stories mostrando os bastidores do projeto.",
        status: ContentStatus.PENDING_APPROVAL,
        sortOrder: 2
      },
      {
        calendarId: calendar.id,
        title: "Manifesto",
        scheduledAt: new Date("2026-10-14T15:00:00.000Z"),
        channel: Channel.INSTAGRAM,
        format: "Carrossel",
        caption:
          "Conteúdo de manifesto para reforçar os pilares da marca.",
        status: ContentStatus.PENDING_APPROVAL,
        sortOrder: 3
      }
    ]
  });

  console.log("Seed concluído.");
  console.log(`DEV: ${dev.email}`);
  console.log(`ADMIN: ${admin.email}`);
  console.log(`DESIGNER: ${designer.email}`);
  console.log("CLIENTE: cliente@dev.com / senha123");
  console.log("Link público: http://localhost:5005/p/demo-terceiro-andar");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

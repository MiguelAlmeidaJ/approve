import {
  Channel,
  ContentStatus,
  PrismaClient
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const designerName =
    process.env.DESIGNER_NAME?.trim() || "Designer Terceiro Andar";
  const designerEmail =
    process.env.DESIGNER_EMAIL?.trim().toLowerCase() ||
    "designer@terceiroandar.com.br";
  const designerPassword =
    process.env.DESIGNER_PASSWORD || "terceiroandar";

  await prisma.designer.upsert({
    where: { email: designerEmail },
    update: {
      name: designerName,
      passwordHash: hashPassword(designerPassword)
    },
    create: {
      name: designerName,
      email: designerEmail,
      passwordHash: hashPassword(designerPassword)
    }
  });

  const client = await prisma.client.upsert({
    where: { slug: "cliente-demo" },
    update: { name: "Cliente Demo" },
    create: {
      name: "Cliente Demo",
      slug: "cliente-demo"
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
  console.log(`Designer: ${designerEmail}`);
  if (!process.env.DESIGNER_PASSWORD) {
    console.log("Senha local padrão: terceiroandar");
  }
  console.log("Link público: http://localhost:3000/p/demo-terceiro-andar");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

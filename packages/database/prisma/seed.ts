import {
  Channel,
  ContentStatus,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
      title: "Calendário editorial — Outubro 2026",
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-31T23:59:59.000Z")
    },
    create: {
      clientId: client.id,
      title: "Calendário editorial — Outubro 2026",
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
        title: "Post institucional",
        scheduledAt: new Date("2026-10-05T12:00:00.000Z"),
        channel: Channel.INSTAGRAM,
        format: "Feed 1080x1350",
        caption: "Uma legenda exemplo pronta para o cliente revisar.",
        status: ContentStatus.PENDING_APPROVAL,
        sortOrder: 1
      },
      {
        calendarId: calendar.id,
        title: "Bastidores da equipe",
        scheduledAt: new Date("2026-10-09T15:00:00.000Z"),
        channel: Channel.STORIES,
        format: "Stories 1080x1920",
        caption: "Sequência de stories mostrando os bastidores do projeto.",
        status: ContentStatus.PENDING_APPROVAL,
        sortOrder: 2
      }
    ]
  });

  console.log("Seed concluído.");
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

import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const name = process.env.DEV_NAME?.trim() || "Dev Terceiro Andar";
  const email =
    process.env.DEV_EMAIL?.trim().toLowerCase() || "designer@dev.com";
  const password = process.env.DEV_PASSWORD || "senha123";

  const user = await prisma.designer.upsert({
    where: { email },
    update: {
      name,
      role: UserRole.DEV,
      passwordHash: hashPassword(password)
    },
    create: {
      name,
      email,
      role: UserRole.DEV,
      passwordHash: hashPassword(password)
    }
  });

  console.log("Usuário DEV criado/atualizado.");
  console.log(`Nome: ${user.name}`);
  console.log(`E-mail: ${user.email}`);
  console.log(`Perfil: ${user.role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

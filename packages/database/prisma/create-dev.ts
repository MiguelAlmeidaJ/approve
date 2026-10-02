import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import * as readline from "node:readline";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const prisma = new PrismaClient();
const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function promptSecret(label: string) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error(
      "Este comando precisa ser executado em um terminal interativo para proteger a senha."
    );
  }

  readline.emitKeypressEvents(input);
  const previousRawMode = input.isRaw;
  input.setRawMode(true);
  input.resume();
  output.write(label);

  return new Promise<string>((resolve, reject) => {
    let value = "";

    function cleanup() {
      input.off("keypress", onKeypress);
      input.setRawMode(Boolean(previousRawMode));
      input.pause();
    }

    function onKeypress(
      chunk: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean }
    ) {
      if (key.ctrl && key.name === "c") {
        cleanup();
        output.write("\n");
        reject(new Error("Criação cancelada."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        output.write("\n");
        resolve(value);
        return;
      }

      if (key.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write("\b \b");
        }
        return;
      }

      if (!key.ctrl && !key.meta && chunk) {
        value += chunk;
        output.write("*");
      }
    }

    input.on("keypress", onKeypress);
  });
}

async function main() {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      "Execute pnpm user:create-dev diretamente em um terminal interativo."
    );
  }

  const existingDev = await prisma.designer.findFirst({
    where: { role: UserRole.DEV },
    select: { id: true, name: true, email: true, active: true }
  });

  if (existingDev) {
    console.log("");
    console.log("Já existe um usuário DEV neste banco.");
    console.log(`Nome: ${existingDev.name}`);
    console.log(`E-mail: ${existingDev.email}`);
    console.log(`Status: ${existingDev.active ? "ativo" : "inativo"}`);
    console.log("");
    console.log(
      "Por segurança, este bootstrap não altera nem redefine um DEV existente."
    );
    return;
  }

  console.log("");
  console.log("Bootstrap do usuário DEV");
  console.log("------------------------");
  console.log(
    "As credenciais serão gravadas diretamente no banco e não serão salvas no .env."
  );
  console.log("");

  const rl = createInterface({ input, output });

  const name = (await rl.question("Nome: ")).trim();
  const email = (await rl.question("E-mail: ")).trim().toLowerCase();
  rl.close();

  if (name.length < 2) {
    throw new Error("Informe um nome com pelo menos 2 caracteres.");
  }

  if (!validEmail(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  const existingEmail = await prisma.designer.findUnique({
    where: { email },
    select: { role: true }
  });

  if (existingEmail) {
    throw new Error(
      `Já existe um usuário com este e-mail (perfil ${existingEmail.role}).`
    );
  }

  const password = await promptSecret("Senha: ");
  const confirmPassword = await promptSecret("Confirme a senha: ");

  if (!STRONG_PASSWORD.test(password)) {
    throw new Error(
      "A senha precisa ter ao menos 8 caracteres, maiúscula, minúscula, número e caractere especial."
    );
  }

  if (password !== confirmPassword) {
    throw new Error("As senhas informadas não coincidem.");
  }

  const user = await prisma.designer.create({
    data: {
      name,
      email,
      role: UserRole.DEV,
      active: true,
      mustChangePassword: false,
      passwordHash: hashPassword(password)
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  console.log("");
  console.log("✓ Usuário DEV criado com sucesso.");
  console.log(`Nome: ${user.name}`);
  console.log(`E-mail: ${user.email}`);
  console.log(`Perfil: ${user.role}`);
  console.log("");
  console.log(
    "Agora entre no sistema com este usuário e crie os demais usuários pela área de gestão."
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      error instanceof Error ? `Erro: ${error.message}` : "Erro ao criar usuário DEV."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

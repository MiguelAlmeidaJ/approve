import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import { PrismaService } from "../prisma.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto
} from "./auth.dto";
import { sendTemporaryPasswordEmail } from "./smtp-mailer";

const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function generateTemporaryPassword() {
  const required = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ"[randomInt(24)],
    "abcdefghijkmnopqrstuvwxyz"[randomInt(25)],
    "23456789"[randomInt(8)],
    "!@#$%&*?"[randomInt(8)]
  ];
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";

  while (required.length < 12) {
    required.push(alphabet[randomInt(alphabet.length)]);
  }

  for (let index = required.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [required[index], required[target]] = [required[target], required[index]];
  }

  return required.join("");
}

function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const designer = await this.prisma.designer.findUnique({
      where: { email }
    });

    if (
      !designer ||
      !designer.active ||
      !verifyPassword(dto.password, designer.passwordHash)
    ) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    );

    await this.prisma.designerSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    await this.prisma.designerSession.create({
      data: {
        designerId: designer.id,
        tokenHash,
        expiresAt
      }
    });

    return {
      token,
      expiresAt,
      designer: {
        id: designer.id,
        name: designer.name,
        email: designer.email,
        role: designer.role,
        active: designer.active,
        mustChangePassword: designer.mustChangePassword
      }
    };
  }

  async me(token: string) {
    const session = await this.prisma.designerSession.findUnique({
      where: {
        tokenHash: hashToken(token)
      },
      include: {
        designer: true
      }
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.designer.active
    ) {
      throw new UnauthorizedException("Sessão expirada.");
    }

    return {
      id: session.designer.id,
      name: session.designer.name,
      email: session.designer.email,
      role: session.designer.role,
      active: session.designer.active,
      mustChangePassword: session.designer.mustChangePassword
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const designer = await this.prisma.designer.findUnique({
      where: { email }
    });

    if (!designer || !designer.active) {
      return { ok: true };
    }

    const temporaryPassword = generateTemporaryPassword();

    try {
      await sendTemporaryPasswordEmail({
        to: designer.email,
        name: designer.name,
        temporaryPassword
      });
    } catch (error) {
      console.error("[auth] Falha ao enviar senha temporária.", error);
      throw new ServiceUnavailableException(
        "Não foi possível enviar o e-mail de recuperação agora."
      );
    }

    await this.prisma.$transaction([
      this.prisma.designer.update({
        where: { id: designer.id },
        data: {
          passwordHash: hashPassword(temporaryPassword),
          mustChangePassword: true
        }
      }),
      this.prisma.designerSession.deleteMany({
        where: { designerId: designer.id }
      })
    ]);

    return { ok: true };
  }

  async changePassword(token: string, dto: ChangePasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("As senhas informadas não coincidem.");
    }

    const tokenHash = hashToken(token);
    const session = await this.prisma.designerSession.findUnique({
      where: { tokenHash },
      include: { designer: true }
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.designer.active
    ) {
      throw new UnauthorizedException("Sessão expirada.");
    }

    if (verifyPassword(dto.password, session.designer.passwordHash)) {
      throw new BadRequestException(
        "Escolha uma senha diferente da senha atual."
      );
    }

    await this.prisma.$transaction([
      this.prisma.designer.update({
        where: { id: session.designerId },
        data: {
          passwordHash: hashPassword(dto.password),
          mustChangePassword: false
        }
      }),
      this.prisma.designerSession.deleteMany({
        where: {
          designerId: session.designerId,
          tokenHash: {
            not: tokenHash
          }
        }
      })
    ]);

    return { ok: true };
  }

  async logout(token: string) {
    await this.prisma.designerSession.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });

    return { ok: true };
  }
}

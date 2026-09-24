import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import { PrismaService } from "../prisma.service";
import { LoginDto } from "./auth.dto";

const SESSION_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

    if (!designer || !verifyPassword(dto.password, designer.passwordHash)) {
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
        active: designer.active
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

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Sessão expirada.");
    }

    return {
      id: session.designer.id,
      name: session.designer.name,
      email: session.designer.email,
      role: session.designer.role,
      active: session.designer.active
    };
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

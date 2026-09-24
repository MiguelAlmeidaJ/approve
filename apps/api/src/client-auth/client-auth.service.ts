import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
import { PrismaService } from "../prisma.service";
import { ClientLoginDto } from "./client-auth.dto";

const SESSION_DAYS = 14;

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
export class ClientAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: ClientLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const credential = await this.prisma.clientCredential.findUnique({
      where: { email },
      include: {
        client: true
      }
    });

    if (
      !credential ||
      !credential.client.active ||
      !verifyPassword(dto.password, credential.passwordHash)
    ) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    );

    await this.prisma.clientSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    await this.prisma.clientSession.create({
      data: {
        clientId: credential.clientId,
        tokenHash: hashToken(token),
        expiresAt
      }
    });

    return {
      token,
      expiresAt,
      client: {
        id: credential.client.id,
        name: credential.client.name,
        niche: credential.client.niche,
        phone: credential.client.phone,
        email: credential.email
      }
    };
  }

  async me(token: string) {
    const session = await this.prisma.clientSession.findUnique({
      where: {
        tokenHash: hashToken(token)
      },
      include: {
        client: {
          include: {
            credential: {
              select: {
                email: true
              }
            },
            calendars: {
              where: {
                archivedAt: null
              },
              orderBy: {
                periodStart: "desc"
              },
              include: {
                contentItems: {
                  select: {
                    id: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (
      !session ||
      session.expiresAt <= new Date() ||
      !session.client.active
    ) {
      throw new UnauthorizedException("Sessão expirada.");
    }

    return session.client;
  }

  async logout(token: string) {
    await this.prisma.clientSession.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });

    return { ok: true };
  }
}

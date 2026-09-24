import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma.service";
import type { InternalActorRequest } from "./internal-actor";
import { IS_PUBLIC_KEY } from "./public.decorator";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const expected = process.env.API_ADMIN_KEY;

    if (!expected) {
      throw new UnauthorizedException(
        "API_ADMIN_KEY precisa estar configurada para acessar rotas administrativas."
      );
    }

    const request =
      context.switchToHttp().getRequest<InternalActorRequest>();

    if (request.headers["x-admin-key"] !== expected) {
      throw new UnauthorizedException("Chave administrativa inválida.");
    }

    const authorization = request.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      throw new UnauthorizedException("Sessão do usuário não informada.");
    }

    const token = authorization.slice(7).trim();
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

    request.actor = {
      id: session.designer.id,
      name: session.designer.name,
      email: session.designer.email,
      role: session.designer.role
    };

    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const value = request.headers["x-admin-key"];

    if (value !== expected) {
      throw new UnauthorizedException("Chave administrativa inválida.");
    }

    return true;
  }
}

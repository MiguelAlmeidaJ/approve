import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { ClientLoginDto } from "./client-auth.dto";
import { ClientAuthService } from "./client-auth.service";

@Public()
@Controller("client-auth")
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Post("login")
  login(@Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(dto);
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.clientAuthService.me(this.getBearerToken(authorization));
  }

  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    return this.clientAuthService.logout(
      this.getBearerToken(authorization)
    );
  }

  private getBearerToken(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Sessão não informada.");
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException("Sessão não informada.");
    }

    return token;
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { Public } from "../common/public.decorator";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto
} from "./auth.dto";
import { AuthService } from "./auth.service";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("change-password")
  changePassword(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: ChangePasswordDto
  ) {
    return this.authService.changePassword(
      this.getBearerToken(authorization),
      dto
    );
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.authService.me(this.getBearerToken(authorization));
  }

  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    return this.authService.logout(this.getBearerToken(authorization));
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

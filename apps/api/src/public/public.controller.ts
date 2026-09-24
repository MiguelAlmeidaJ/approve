import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { ReviewContentDto } from "./public.dto";
import { PublicService } from "./public.service";

@Public()
@Controller("public/calendars")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(":token")
  getCalendar(
    @Headers("authorization") authorization: string | undefined,
    @Param("token") token: string
  ) {
    return this.publicService.getCalendar(
      this.getBearerToken(authorization),
      token
    );
  }

  @Post(":token/items/:itemId/review")
  review(
    @Headers("authorization") authorization: string | undefined,
    @Param("token") token: string,
    @Param("itemId") itemId: string,
    @Body() dto: ReviewContentDto
  ) {
    return this.publicService.review(
      this.getBearerToken(authorization),
      token,
      itemId,
      dto
    );
  }

  private getBearerToken(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Sessão do cliente não informada.");
    }

    return authorization.slice(7).trim();
  }
}

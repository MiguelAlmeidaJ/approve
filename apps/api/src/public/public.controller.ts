import {
  Body,
  Controller,
  Get,
  Param,
  Post
} from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { CreatePublicAnnotationDto, ReviewContentDto } from "./public.dto";
import { PublicService } from "./public.service";

@Public()
@Controller("public/calendars")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(":token")
  getCalendar(@Param("token") token: string) {
    return this.publicService.getCalendar(token);
  }

  @Post(":token/items/:itemId/annotations")
  createAnnotation(
    @Param("token") token: string,
    @Param("itemId") itemId: string,
    @Body() dto: CreatePublicAnnotationDto
  ) {
    return this.publicService.createAnnotation(token, itemId, dto);
  }

  @Post(":token/items/:itemId/review")
  review(
    @Param("token") token: string,
    @Param("itemId") itemId: string,
    @Body() dto: ReviewContentDto
  ) {
    return this.publicService.review(token, itemId, dto);
  }
}

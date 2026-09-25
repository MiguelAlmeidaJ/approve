import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import type { InternalActorRequest } from "../common/internal-actor";
import {
  AssignClientDto,
  AttachArtworkDto,
  CreateCalendarDto,
  CreateClientDto,
  CreateCommemorativeDateDto,
  CreateContentFormatDto,
  CreateContentItemDto,
  CreateDesignerDto,
  CreatePlanningItemDto,
  MarkScheduledDto,
  MarkSchedulingErrorDto,
  MoveContentItemDto,
  SetActiveDto,
  UpdateCalendarDto,
  UpdateClientDto,
  UpdateCommemorativeDateDto,
  UpdateContentFormatDto,
  UpdatePlanningItemDto,
  UpdateUserDto
} from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard(@Req() request: InternalActorRequest) {
    return this.adminService.dashboard(request.actor);
  }

  @Get("designers")
  listDesigners(@Req() request: InternalActorRequest) {
    return this.adminService.listDesigners(request.actor);
  }

  @Get("users")
  listUsers(@Req() request: InternalActorRequest) {
    return this.adminService.listUsers(request.actor);
  }

  @Get("formats")
  listFormats(@Req() request: InternalActorRequest) {
    return this.adminService.listFormats(request.actor);
  }

  @Get("commemorative-dates")
  listCommemorativeDates(@Req() request: InternalActorRequest) {
    return this.adminService.listCommemorativeDates(request.actor);
  }

  @Post("commemorative-dates")
  createCommemorativeDate(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateCommemorativeDateDto
  ) {
    return this.adminService.createCommemorativeDate(request.actor, dto);
  }

  @Patch("commemorative-dates/:id")
  updateCommemorativeDate(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCommemorativeDateDto
  ) {
    return this.adminService.updateCommemorativeDate(request.actor, id, dto);
  }

  @Get("clients/:id")
  getClient(@Req() request: InternalActorRequest, @Param("id") id: string) {
    return this.adminService.getClient(request.actor, id);
  }

  @Get("calendars/:id")
  getCalendar(@Req() request: InternalActorRequest, @Param("id") id: string) {
    return this.adminService.getCalendar(request.actor, id);
  }

  @Post("designers")
  createDesigner(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateDesignerDto
  ) {
    return this.adminService.createDesigner(request.actor, dto);
  }

  @Post("users")
  createUser(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateDesignerDto
  ) {
    return this.adminService.createUser(request.actor, dto);
  }

  @Patch("users/:id")
  updateUser(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.adminService.updateUser(request.actor, id, dto);
  }

  @Patch("users/:id/active")
  setUserActive(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: SetActiveDto
  ) {
    return this.adminService.setUserActive(request.actor, id, dto.active);
  }

  @Post("formats")
  createFormat(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateContentFormatDto
  ) {
    return this.adminService.createFormat(request.actor, dto);
  }

  @Patch("formats/:id")
  updateFormat(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdateContentFormatDto
  ) {
    return this.adminService.updateFormat(request.actor, id, dto);
  }

  @Post("clients")
  createClient(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateClientDto
  ) {
    return this.adminService.createClient(request.actor, dto);
  }

  @Patch("clients/:id")
  updateClient(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdateClientDto
  ) {
    return this.adminService.updateClient(request.actor, id, dto);
  }

  @Patch("clients/:id/active")
  setClientActive(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: SetActiveDto
  ) {
    return this.adminService.setClientActive(request.actor, id, dto.active);
  }

  @Post("clients/:id/assign")
  assignClient(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: AssignClientDto
  ) {
    return this.adminService.assignClient(request.actor, id, dto);
  }

  @Post("calendars")
  createCalendar(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateCalendarDto
  ) {
    return this.adminService.createCalendar(request.actor, dto);
  }

  @Patch("calendars/:id")
  updateCalendar(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCalendarDto
  ) {
    return this.adminService.updateCalendar(request.actor, id, dto);
  }

  @Post("calendars/:id/archive")
  archiveCalendar(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.archiveCalendar(request.actor, id);
  }

  @Post("calendars/:id/restore")
  restoreCalendar(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.restoreCalendar(request.actor, id);
  }

  @Post("calendars/:id/planning-items")
  createPlanningItem(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: CreatePlanningItemDto
  ) {
    return this.adminService.createPlanningItem(request.actor, id, dto);
  }

  @Patch("items/:id/planning")
  updatePlanningItem(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: UpdatePlanningItemDto
  ) {
    return this.adminService.updatePlanningItem(request.actor, id, dto);
  }

  @Post("calendars/:id/submit-planning")
  submitPlanning(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.submitPlanning(request.actor, id);
  }

  @Post("items/:id/artwork")
  attachArtwork(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: AttachArtworkDto
  ) {
    return this.adminService.attachArtwork(request.actor, id, dto);
  }

  @Post("calendars/:id/submit-artwork")
  submitArtwork(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.submitArtwork(request.actor, id);
  }

  @Post("items/:id/scheduled")
  markScheduled(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: MarkScheduledDto
  ) {
    return this.adminService.markScheduled(request.actor, id, dto);
  }

  @Post("items/:id/published")
  markPublished(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.markPublished(request.actor, id);
  }

  @Post("items/:id/scheduling-error")
  markSchedulingError(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: MarkSchedulingErrorDto
  ) {
    return this.adminService.markSchedulingError(request.actor, id, dto);
  }

  @Post("items")
  createContentItem(
    @Req() request: InternalActorRequest,
    @Body() dto: CreateContentItemDto
  ) {
    return this.adminService.createContentItem(request.actor, dto);
  }

  @Patch("items/:id/schedule")
  moveContentItem(
    @Req() request: InternalActorRequest,
    @Param("id") id: string,
    @Body() dto: MoveContentItemDto
  ) {
    return this.adminService.moveContentItem(request.actor, id, dto);
  }

  @Post("calendars/:id/rotate-token")
  rotateCalendarToken(
    @Req() request: InternalActorRequest,
    @Param("id") id: string
  ) {
    return this.adminService.rotateCalendarToken(request.actor, id);
  }
}

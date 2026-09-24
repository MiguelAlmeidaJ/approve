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
  CreateCalendarDto,
  CreateClientDto,
  CreateContentFormatDto,
  CreateContentItemDto,
  CreateDesignerDto,
  MoveContentItemDto,
  UpdateCalendarDto,
  UpdateClientDto,
  UpdateContentFormatDto,
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

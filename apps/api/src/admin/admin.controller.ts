import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  AssignClientDto,
  CreateCalendarDto,
  CreateClientDto,
  CreateContentItemDto,
  CreateDesignerDto
} from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get("designers")
  listDesigners() {
    return this.adminService.listDesigners();
  }

  @Get("clients/:id")
  getClient(@Param("id") id: string) {
    return this.adminService.getClient(id);
  }

  @Get("calendars/:id")
  getCalendar(@Param("id") id: string) {
    return this.adminService.getCalendar(id);
  }

  @Post("designers")
  createDesigner(@Body() dto: CreateDesignerDto) {
    return this.adminService.createDesigner(dto);
  }

  @Post("clients")
  createClient(@Body() dto: CreateClientDto) {
    return this.adminService.createClient(dto);
  }

  @Post("clients/:id/assign")
  assignClient(
    @Param("id") id: string,
    @Body() dto: AssignClientDto
  ) {
    return this.adminService.assignClient(id, dto);
  }

  @Post("calendars")
  createCalendar(@Body() dto: CreateCalendarDto) {
    return this.adminService.createCalendar(dto);
  }

  @Post("items")
  createContentItem(@Body() dto: CreateContentItemDto) {
    return this.adminService.createContentItem(dto);
  }

  @Post("calendars/:id/rotate-token")
  rotateCalendarToken(@Param("id") id: string) {
    return this.adminService.rotateCalendarToken(id);
  }
}

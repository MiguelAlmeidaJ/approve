import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  CreateCalendarDto,
  CreateClientDto,
  CreateContentItemDto
} from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get("clients/:id")
  getClient(@Param("id") id: string) {
    return this.adminService.getClient(id);
  }

  @Get("calendars/:id")
  getCalendar(@Param("id") id: string) {
    return this.adminService.getCalendar(id);
  }

  @Post("clients")
  createClient(@Body() dto: CreateClientDto) {
    return this.adminService.createClient(dto);
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

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import {
  AssignClientDto,
  CreateCalendarDto,
  CreateClientDto,
  CreateContentItemDto,
  CreateDesignerDto,
  UpdateClientDto,
  UpdateUserDto
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

  @Get("users")
  listUsers() {
    return this.adminService.listUsers();
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

  @Post("users")
  createUser(@Body() dto: CreateDesignerDto) {
    return this.adminService.createUser(dto);
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Post("clients")
  createClient(@Body() dto: CreateClientDto) {
    return this.adminService.createClient(dto);
  }

  @Patch("clients/:id")
  updateClient(
    @Param("id") id: string,
    @Body() dto: UpdateClientDto
  ) {
    return this.adminService.updateClient(id, dto);
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

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdminKeyGuard } from "./common/admin-key.guard";
import { PrismaService } from "./prisma.service";
import { AppController } from "./app.controller";
import { AdminController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import { PublicController } from "./public/public.controller";
import { PublicService } from "./public/public.service";

@Module({
  controllers: [AppController, AdminController, PublicController],
  providers: [
    PrismaService,
    AdminService,
    PublicService,
    {
      provide: APP_GUARD,
      useClass: AdminKeyGuard
    }
  ]
})
export class AppModule {}

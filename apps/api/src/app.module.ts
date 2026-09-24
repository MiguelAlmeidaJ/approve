import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdminController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import { AppController } from "./app.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ClientAuthController } from "./client-auth/client-auth.controller";
import { ClientAuthService } from "./client-auth/client-auth.service";
import { AdminKeyGuard } from "./common/admin-key.guard";
import { NextcloudController } from "./nextcloud/nextcloud.controller";
import { NextcloudService } from "./nextcloud/nextcloud.service";
import { PrismaService } from "./prisma.service";
import { PublicController } from "./public/public.controller";
import { PublicService } from "./public/public.service";

@Module({
  controllers: [
    AppController,
    AuthController,
    ClientAuthController,
    AdminController,
    NextcloudController,
    PublicController
  ],
  providers: [
    PrismaService,
    AuthService,
    ClientAuthService,
    AdminService,
    NextcloudService,
    PublicService,
    {
      provide: APP_GUARD,
      useClass: AdminKeyGuard
    }
  ]
})
export class AppModule {}

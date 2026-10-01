import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Readable } from "node:stream";
import type { InternalActorRequest } from "../common/internal-actor";
import { Public } from "../common/public.decorator";
import { NextcloudService } from "./nextcloud.service";

type HttpResponse = NodeJS.WritableStream & {
  status(code: number): HttpResponse;
  setHeader(name: string, value: string): void;
  end(): void;
};

@Controller()
export class NextcloudController {
  constructor(private readonly nextcloudService: NextcloudService) {}

  @Get("admin/nextcloud/system-files")
  listSystemFiles(
    @Req() request: InternalActorRequest,
    @Query("path") path = "/"
  ) {
    return this.nextcloudService.listSystemForActor(request.actor, path);
  }

  @Get("admin/nextcloud/system-file")
  async previewSystemFile(
    @Req() request: InternalActorRequest,
    @Query("path") path: string,
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const result = await this.nextcloudService.previewSystemForActor(
      request.actor,
      path,
      range
    );

    await this.pipeResponse(result.response, response, result.metadata.name);
  }

  @Public()
  @Get("public/branding/:kind")
  async publicBranding(
    @Param("kind") kind: "logo" | "logo-dark" | "favicon",
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const normalizedKind =
      kind === "favicon" ? "favicon" : kind === "logo-dark" ? "logo-dark" : "logo";
    const result = await this.nextcloudService.previewBrandAsset(
      normalizedKind,
      range
    );

    await this.pipeResponse(result.response, response, result.metadata.name);
  }

  @Public()
  @Get("public/calendars/:shareToken/client-logo")
  async publicClientLogo(
    @Param("shareToken") shareToken: string,
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const result = await this.nextcloudService.previewClientLogoForPublicShare(
      shareToken,
      range
    );

    await this.pipeResponse(result.response, response, result.metadata.name);
  }

  @Get("admin/nextcloud/files")
  listFiles(
    @Req() request: InternalActorRequest,
    @Query("clientId") clientId: string,
    @Query("path") path = "/"
  ) {
    return this.nextcloudService.listForActor(
      request.actor,
      clientId,
      path
    );
  }

  @Post("admin/nextcloud/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 60 * 1024 * 1024
      }
    })
  )
  uploadFile(
    @Req() request: InternalActorRequest,
    @Body("clientId") clientId: string,
    @Body("path") path = "/",
    @UploadedFile()
    file:
      | {
          originalname: string;
          mimetype: string;
          buffer: Buffer;
        }
      | undefined
  ) {
    if (!file) {
      throw new Error("Arquivo não informado.");
    }

    return this.nextcloudService.uploadForActor(
      request.actor,
      clientId,
      path,
      file.originalname,
      file.mimetype,
      file.buffer
    );
  }

  @Get("admin/nextcloud/file")
  async previewFile(
    @Req() request: InternalActorRequest,
    @Query("clientId") clientId: string,
    @Query("path") path: string,
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const result = await this.nextcloudService.previewForActor(
      request.actor,
      clientId,
      path,
      range
    );

    await this.pipeResponse(result.response, response);
  }

  @Get("admin/assets/:assetId/file")
  async internalAsset(
    @Req() request: InternalActorRequest,
    @Param("assetId") assetId: string,
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const asset = await this.nextcloudService.getAssetForActor(
      request.actor,
      assetId
    );
    const upstream = await this.nextcloudService.downloadStoredPath(
      asset.filePath,
      range
    );

    await this.pipeResponse(upstream, response, asset.fileName);
  }

  @Public()
  @Get("public/assets/:assetId/file")
  async clientAsset(
    @Headers("authorization") authorization: string | undefined,
    @Param("assetId") assetId: string,
    @Query("shareToken") shareToken: string | undefined,
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    const asset = shareToken
      ? await this.nextcloudService.getAssetForPublicShare(
          shareToken,
          assetId
        )
      : await this.nextcloudService.getAssetForClientSession(token, assetId);
    const upstream = await this.nextcloudService.downloadStoredPath(
      asset.filePath,
      range
    );

    await this.pipeResponse(
      upstream,
      response,
      shareToken ? undefined : asset.fileName
    );
  }

  private async pipeResponse(
    upstream: globalThis.Response,
    response: HttpResponse,
    fileName?: string
  ) {
    response.status(upstream.status);

    for (const header of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified"
    ]) {
      const value = upstream.headers.get(header);

      if (value) {
        response.setHeader(header, value);
      }
    }

    response.setHeader("cache-control", "private, no-store, max-age=0");
    response.setHeader("pragma", "no-cache");
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-robots-tag", "noindex, noarchive");
    response.setHeader("cross-origin-resource-policy", "same-origin");

    if (fileName) {
      response.setHeader(
        "content-disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
    }

    if (!upstream.body) {
      response.end();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      Readable.fromWeb(upstream.body as any)
        .on("error", reject)
        .on("end", resolve)
        .pipe(response);
    });
  }
}

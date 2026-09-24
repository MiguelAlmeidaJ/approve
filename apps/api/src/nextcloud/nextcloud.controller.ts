import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Req,
  Res
} from "@nestjs/common";
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
    @Headers("range") range: string | undefined,
    @Res() response: HttpResponse
  ) {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    const asset =
      await this.nextcloudService.getAssetForClientSession(token, assetId);
    const upstream = await this.nextcloudService.downloadStoredPath(
      asset.filePath,
      range
    );

    await this.pipeResponse(upstream, response, asset.fileName);
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

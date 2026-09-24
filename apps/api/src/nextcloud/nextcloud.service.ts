import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ContentStatus, UserRole } from "@approve/database";
import { createHash } from "node:crypto";
import type { InternalActor } from "../common/internal-actor";
import { PrismaService } from "../prisma.service";

export type NextcloudFileItem = {
  name: string;
  path: string;
  isDirectory: boolean;
  mimeType: string | null;
  etag: string | null;
  fileId: string | null;
  size: number | null;
};

type NextcloudMetadata = NextcloudFileItem & {
  storedPath: string;
};

type ClientStorageScope = {
  slug: string;
  nextcloudPath: string | null;
};

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(
      `<(?:[A-Za-z0-9_-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${tag}>`,
      "i"
    )
  );

  return match ? decodeXml(match[1].trim()) : null;
}

function responseBlocks(xml: string) {
  return (
    xml.match(
      /<(?:[A-Za-z0-9_-]+:)?response\b[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?response>/gi
    ) ?? []
  );
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class NextcloudService {
  constructor(private readonly prisma: PrismaService) {}

  isConfigured() {
    return Boolean(
      process.env.NEXTCLOUD_URL?.trim() &&
        process.env.NEXTCLOUD_USERNAME?.trim() &&
        process.env.NEXTCLOUD_APP_PASSWORD?.trim()
    );
  }

  async listForActor(
    actor: InternalActor,
    clientId: string,
    path = "/"
  ): Promise<NextcloudFileItem[]> {
    const client = await this.getAccessibleClient(actor, clientId);
    return this.list(this.clientDirectory(client), path);
  }

  async previewForActor(
    actor: InternalActor,
    clientId: string,
    path: string,
    range?: string
  ) {
    const client = await this.getAccessibleClient(actor, clientId);
    const metadata = await this.getMetadata(
      this.clientDirectory(client),
      path
    );

    return {
      metadata,
      response: await this.downloadStoredPath(metadata.storedPath, range)
    };
  }

  async getMetadata(
    clientDirectory: string,
    relativePath: string
  ): Promise<NextcloudMetadata> {
    const directory = this.normalizeRelativePath(clientDirectory);
    const path = this.normalizeRelativePath(relativePath);

    if (path === "/") {
      throw new BadRequestException("Selecione um arquivo do Nextcloud.");
    }

    const storedPath = this.clientStoredPath(directory, path);
    const response = await this.propfind(storedPath, "0");
    const xml = await response.text();
    const block = responseBlocks(xml)[0];

    if (!block) {
      throw new NotFoundException("Arquivo não encontrado no Nextcloud.");
    }

    const isDirectory =
      /<(?:[A-Za-z0-9_-]+:)?collection\s*\/?>/i.test(block);

    if (isDirectory) {
      throw new BadRequestException("Selecione um arquivo, não uma pasta.");
    }

    const name =
      extractTag(block, "displayname") ??
      path.split("/").filter(Boolean).at(-1) ??
      "arquivo";

    return {
      name,
      path,
      storedPath,
      isDirectory: false,
      mimeType: extractTag(block, "getcontenttype"),
      etag: extractTag(block, "getetag")?.replace(/^"|"$/g, "") ?? null,
      fileId: extractTag(block, "fileid"),
      size: this.numberOrNull(extractTag(block, "getcontentlength"))
    };
  }

  async downloadStoredPath(storedPath: string, range?: string) {
    this.assertConfigured();
    const response = await fetch(this.davUrl(storedPath), {
      method: "GET",
      headers: {
        authorization: this.authorization(),
        ...(range ? { range } : {})
      },
      cache: "no-store"
    });

    if (!response.ok && response.status !== 206) {
      throw new BadGatewayException(
        `Nextcloud respondeu ${response.status} ao carregar a arte.`
      );
    }

    return response;
  }

  async getAssetForPublicShare(shareToken: string, assetId: string) {
    if (!shareToken) {
      throw new UnauthorizedException("Link público não informado.");
    }

    const asset = await this.prisma.contentAsset.findFirst({
      where: {
        id: assetId,
        contentItem: {
          status: {
            not: ContentStatus.DRAFT
          },
          calendar: {
            shareToken,
            archivedAt: null
          }
        }
      }
    });

    if (!asset) {
      throw new NotFoundException("Arte não encontrada neste calendário público.");
    }

    return asset;
  }

  async getAssetForClientSession(clientToken: string, assetId: string) {
    if (!clientToken) {
      throw new UnauthorizedException("Sessão do cliente não informada.");
    }

    const session = await this.prisma.clientSession.findUnique({
      where: {
        tokenHash: hashToken(clientToken)
      },
      select: {
        clientId: true,
        expiresAt: true
      }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Sessão do cliente expirada.");
    }

    const asset = await this.prisma.contentAsset.findFirst({
      where: {
        id: assetId,
        contentItem: {
          calendar: {
            clientId: session.clientId,
            archivedAt: null
          }
        }
      }
    });

    if (!asset) {
      throw new NotFoundException("Arte não encontrada para esta conta.");
    }

    return asset;
  }

  async getAssetForActor(actor: InternalActor, assetId: string) {
    const asset = await this.prisma.contentAsset.findFirst({
      where: {
        id: assetId,
        ...(actor.role === UserRole.DESIGNER
          ? {
              contentItem: {
                calendar: {
                  client: {
                    assignedDesignerId: actor.id
                  }
                }
              }
            }
          : {})
      }
    });

    if (!asset) {
      throw new NotFoundException("Arte não encontrada.");
    }

    return asset;
  }

  private async list(
    clientDirectory: string,
    relativePath: string
  ): Promise<NextcloudFileItem[]> {
    const directory = this.normalizeRelativePath(clientDirectory);
    const path = this.normalizeRelativePath(relativePath);
    const storedPath = this.clientStoredPath(directory, path);
    const response = await this.propfind(storedPath, "1");
    const xml = await response.text();
    const blocks = responseBlocks(xml);

    return blocks.slice(1).map((block) => {
      const isDirectory =
        /<(?:[A-Za-z0-9_-]+:)?collection\s*\/?>/i.test(block);
      const href = extractTag(block, "href");
      const fallbackName = href
        ? decodeURIComponent(href)
            .split("/")
            .filter(Boolean)
            .at(-1)
        : null;
      const name =
        extractTag(block, "displayname") ?? fallbackName ?? "arquivo";

      return {
        name,
        path: this.joinRelative(path, name),
        isDirectory,
        mimeType: isDirectory ? null : extractTag(block, "getcontenttype"),
        etag:
          extractTag(block, "getetag")?.replace(/^"|"$/g, "") ?? null,
        fileId: extractTag(block, "fileid"),
        size: isDirectory
          ? null
          : this.numberOrNull(extractTag(block, "getcontentlength"))
      };
    });
  }

  private async propfind(storedPath: string, depth: "0" | "1") {
    this.assertConfigured();

    const response = await fetch(this.davUrl(storedPath), {
      method: "PROPFIND",
      headers: {
        authorization: this.authorization(),
        depth,
        "content-type": "application/xml; charset=utf-8"
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <d:displayname />
    <d:getcontenttype />
    <d:getcontentlength />
    <d:getetag />
    <d:resourcetype />
    <oc:fileid />
  </d:prop>
</d:propfind>`,
      cache: "no-store"
    });

    if (response.status === 404) {
      throw new NotFoundException(
        `Pasta ou arquivo não encontrado no Nextcloud: ${storedPath}. Verifique a pasta configurada no cliente.`
      );
    }

    if (!response.ok && response.status !== 207) {
      throw new BadGatewayException(
        `Nextcloud respondeu ${response.status} ao consultar arquivos.`
      );
    }

    return response;
  }

  private async getAccessibleClient(actor: InternalActor, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        ...(actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : {})
      },
      select: {
        id: true,
        slug: true,
        nextcloudPath: true
      }
    });

    if (!client) {
      throw new ForbiddenException("Você não tem acesso a este cliente.");
    }

    return client;
  }

  private clientDirectory(client: ClientStorageScope) {
    if (client.nextcloudPath) {
      return this.normalizeRelativePath(client.nextcloudPath);
    }

    return this.normalizeRelativePath(`/${client.slug}`);
  }

  private clientStoredPath(
    clientDirectory: string,
    relativePath: string
  ) {
    const directory =
      clientDirectory === "/" ? "" : clientDirectory;

    return `${directory}${
      relativePath === "/" ? "" : relativePath
    }` || "/";
  }

  private normalizeRelativePath(value: string) {
    const raw = (value || "/").replaceAll("\\", "/").trim();
    const segments = raw
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));

    if (segments.some((segment) => segment === ".." || segment === ".")) {
      throw new BadRequestException("Caminho inválido.");
    }

    return segments.length === 0 ? "/" : `/${segments.join("/")}`;
  }

  private joinRelative(base: string, name: string) {
    const normalizedBase = base === "/" ? "" : base;
    return this.normalizeRelativePath(
      `${normalizedBase}/${encodeURIComponent(name)}`
    );
  }

  private davUrl(storedPath: string) {
    const base = this.baseUrl();
    const username = this.username();
    const root = this.rootPath();
    const path = `${root}${storedPath}`
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${base}/remote.php/dav/files/${encodeURIComponent(username)}/${path}`;
  }

  private rootPath() {
    const root = process.env.NEXTCLOUD_ROOT_PATH?.trim() || "/Clientes";
    const normalized = root.replaceAll("\\", "/");
    return `/${normalized.split("/").filter(Boolean).join("/")}`;
  }

  private baseUrl() {
    return (process.env.NEXTCLOUD_URL ?? "").trim().replace(/\/+$/, "");
  }

  private username() {
    return (process.env.NEXTCLOUD_USERNAME ?? "").trim();
  }

  private authorization() {
    return `Basic ${Buffer.from(
      `${this.username()}:${process.env.NEXTCLOUD_APP_PASSWORD ?? ""}`
    ).toString("base64")}`;
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Integração com Nextcloud ainda não foi configurada."
      );
    }
  }

  private numberOrNull(value: string | null) {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

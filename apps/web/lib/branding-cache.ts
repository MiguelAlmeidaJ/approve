import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getApiUrl } from "./api";

export type BrandingKind = "logo" | "logo-dark" | "favicon";

type BrandingCacheMeta = {
  contentType: string;
  updatedAt: string;
};

function cacheDirectory() {
  return path.join(process.cwd(), "public", "branding-cache");
}

function assetPath(kind: BrandingKind) {
  return path.join(cacheDirectory(), `${kind}.bin`);
}

function metaPath(kind: BrandingKind) {
  return path.join(cacheDirectory(), `${kind}.json`);
}

export async function readBrandingCache(kind: BrandingKind) {
  try {
    const [body, rawMeta] = await Promise.all([
      readFile(assetPath(kind)),
      readFile(metaPath(kind), "utf8")
    ]);
    const meta = JSON.parse(rawMeta) as BrandingCacheMeta;

    if (!meta.contentType?.startsWith("image/")) {
      return null;
    }

    return {
      body,
      contentType: meta.contentType,
      updatedAt: meta.updatedAt
    };
  } catch {
    return null;
  }
}

export async function clearBrandingCache(kind: BrandingKind) {
  await Promise.all([
    rm(assetPath(kind), { force: true }),
    rm(metaPath(kind), { force: true })
  ]);
}

export async function writeBrandingCache(
  kind: BrandingKind,
  body: Uint8Array,
  contentType: string
) {
  if (!contentType.startsWith("image/")) {
    throw new Error(`Arquivo de branding inválido para ${kind}.`);
  }

  await mkdir(cacheDirectory(), { recursive: true });

  await Promise.all([
    writeFile(assetPath(kind), body),
    writeFile(
      metaPath(kind),
      JSON.stringify(
        {
          contentType,
          updatedAt: new Date().toISOString()
        } satisfies BrandingCacheMeta,
        null,
        2
      ),
      "utf8"
    )
  ]);
}

export async function syncBrandingCache(kind: BrandingKind) {
  const response = await fetch(
    `${getApiUrl()}/api/public/branding/${kind}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível armazenar ${kind} localmente: ${response.status}.`
    );
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const body = new Uint8Array(await response.arrayBuffer());

  await writeBrandingCache(kind, body, contentType);
}

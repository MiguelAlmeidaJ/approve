"use client";

import { useState } from "react";
import {
  NextcloudAssetPicker,
  type SelectedNextcloudAsset
} from "./nextcloud-asset-picker";

export function ClientLogoField({
  clientId,
  initialPath,
  initialName
}: {
  clientId: string;
  initialPath?: string | null;
  initialName?: string | null;
}) {
  const [selected, setSelected] = useState<SelectedNextcloudAsset[]>(() =>
    initialPath
      ? [
          {
            path: initialPath,
            name: initialName || "Logo do cliente",
            mimeType: "image/*",
            fileId: null,
            etag: null
          }
        ]
      : []
  );
  const logo = selected[0];

  return (
    <div className="client-logo-field">
      <input type="hidden" name="logoPath" value={logo?.path ?? ""} />
      <input type="hidden" name="logoName" value={logo?.name ?? ""} />
      <NextcloudAssetPicker
        clientId={clientId}
        multiple={false}
        selected={selected}
        onChange={setSelected}
        context="client-logo"
      />
      <p>
        Prefira arquivos PNG, SVG ou WebP com fundo transparente e boa margem
        interna. A imagem original continua armazenada no Nextcloud.
      </p>
    </div>
  );
}

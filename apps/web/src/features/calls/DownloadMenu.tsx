import type { CallDetail } from "@scc/shared";
import { DownloadIcon, FileAudioIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { saveFile } from "@/lib/download";
import { api } from "@/lib/endpoints";

import { EXPORT_FORMATS, type ExportFormat, exportTranscript } from "./transcript-export";

/** DownloadMenu: the recording, and the transcript in the formats other tools read. */
export function DownloadMenu({ detail }: { detail: CallDetail }) {
  const base = detail.call.originalFilename.replace(/\.[^.]+$/, "");
  const translated = detail.segments.some((s) => s.translation);

  function transcript(format: ExportFormat, english: boolean) {
    const file = exportTranscript(detail.segments, format, { english });
    const url = URL.createObjectURL(new Blob([file.body], { type: `${file.mime};charset=utf-8` }));
    saveFile(url, `${base}${english ? ".en" : ""}.${file.extension}`);
    URL.revokeObjectURL(url);
  }

  async function recording() {
    try {
      const { url } = await api.audioDownloadUrl(detail.call.id);
      saveFile(url, detail.call.originalFilename);
    } catch (e) {
      toastManager.add({
        type: "error",
        title: "Could not download the recording",
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" size="sm" />}>
        <DownloadIcon aria-hidden="true" />
        Download
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-56">
        <MenuItem
          disabled={!detail.audioAvailable}
          onClick={() => {
            void recording();
          }}
        >
          <FileAudioIcon aria-hidden="true" />
          Recording ({detail.call.originalFilename.split(".").pop()?.toUpperCase()})
        </MenuItem>
        {detail.segments.length > 0 ? (
          <>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Transcript</MenuGroupLabel>
              {EXPORT_FORMATS.map((f) => (
                <MenuItem
                  key={f.format}
                  onClick={() => {
                    transcript(f.format, false);
                  }}
                >
                  <FileTextIcon aria-hidden="true" />
                  {f.label} (.{f.extension})
                </MenuItem>
              ))}
            </MenuGroup>
            {translated ? (
              <MenuGroup>
                <MenuGroupLabel>English translation</MenuGroupLabel>
                {EXPORT_FORMATS.filter((f) => f.format !== "json").map((f) => (
                  <MenuItem
                    key={f.format}
                    onClick={() => {
                      transcript(f.format, true);
                    }}
                  >
                    <FileTextIcon aria-hidden="true" />
                    {f.label} in English (.{f.extension})
                  </MenuItem>
                ))}
              </MenuGroup>
            ) : null}
          </>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}

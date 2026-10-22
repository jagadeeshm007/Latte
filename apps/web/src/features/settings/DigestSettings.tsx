import { DIGEST_FREQUENCIES } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, digestQuery } from "@/lib/endpoints";

const FREQUENCY_LABEL = { off: "Off", daily: "Daily", weekly: "Weekly" } as const;

/** DigestSettings: how often the period's headline numbers arrive (ADR-0025). */
export function DigestSettings() {
  const queryClient = useQueryClient();
  const digest = useQuery(digestQuery);
  const set = useMutation({
    mutationFn: (f: (typeof DIGEST_FREQUENCIES)[number]) => api.setDigest(f),
    onSuccess: (data) => {
      queryClient.setQueryData(digestQuery.queryKey, data);
    },
  });
  return (
    <Frame role="region" aria-labelledby="digest-heading">
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2} id="digest-heading">
          Digest
        </FrameTitle>
        <FrameDescription>
          The period's headline numbers, top performers and who needs coaching, in your inbox.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="px-4 py-3">
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label="Digest frequency"
          value={[digest.data?.frequency ?? "off"]}
          onValueChange={(v: unknown[]) => {
            const next = DIGEST_FREQUENCIES.find((f) => f === v[0]);
            if (next) set.mutate(next);
          }}
        >
          {DIGEST_FREQUENCIES.map((f) => (
            <ToggleGroupItem key={f} value={f}>
              {FREQUENCY_LABEL[f]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FramePanel>
    </Frame>
  );
}

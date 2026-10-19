import type { TeamSettings } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Frame, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { api, teamsQuery } from "@/lib/endpoints";

// Teams: how long each team's recordings are kept before they are deleted
// (ADR-0023). Transcripts and scores stay; only the audio goes.

export function TeamsPage() {
  const teams = useQuery(teamsQuery);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description="How long each team's recordings are kept. Transcripts and scores are kept either way; only the audio is deleted."
      />
      {teams.isPending ? (
        <Loading label="Loading teams" shape="table" />
      ) : teams.isError ? (
        <ErrorState error={teams.error} />
      ) : (
        <Frame>
          <FramePanel className="overflow-x-auto p-0">
            <Table aria-label="Teams">
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-end">Calls</TableHead>
                  <TableHead>Keep recordings for</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.data.items.map((t) => (
                  <TeamRow key={t.id} team={t} defaultDays={teams.data.defaultRetentionDays} />
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>
      )}
    </div>
  );
}

function TeamRow({ team, defaultDays }: { team: TeamSettings; defaultDays: number }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(
    team.audioRetentionDays === null ? "" : String(team.audioRetentionDays),
  );
  const value = days.trim() === "" ? null : Number(days);
  const valid = value === null || (Number.isInteger(value) && value >= 1 && value <= 3650);
  const save = useMutation({
    mutationFn: () => api.updateTeam(team.id, { audioRetentionDays: value }),
    onSuccess: async (saved) => {
      toastManager.add({
        type: "success",
        title: `${team.name}: recordings kept ${String(saved.effectiveRetentionDays)} days`,
      });
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e) => toastManager.add({ type: "error", title: "Not saved", description: e.message }),
  });
  const changed = value !== team.audioRetentionDays;
  return (
    <TableRow>
      <TableCell className="font-medium">{team.name}</TableCell>
      <TableCell className="text-end tabular-nums">{team.calls}</TableCell>
      <TableCell>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && changed) save.mutate();
          }}
        >
          <Input
            type="number"
            size="sm"
            min={1}
            max={3650}
            className="w-28"
            aria-label={`Days to keep ${team.name}'s recordings`}
            placeholder={`${String(defaultDays)} (default)`}
            value={days}
            aria-invalid={!valid}
            onChange={(e) => {
              setDays(e.target.value);
            }}
          />
          <span className="text-sm text-muted-foreground">days</span>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!valid || !changed}
            loading={save.isPending}
          >
            Save
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}

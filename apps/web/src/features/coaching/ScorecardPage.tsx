import type { Scorecard } from "@scc/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState, ErrorState, Loading, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { CallsTable } from "@/features/calls/CallsTable";
import { scorecardQuery } from "@/lib/endpoints";
import { formatPercent } from "@/lib/format";

// S7: an agent's scorecard and top three coaching points (US-00-001,
// US-00-002). QA and managers open the same view for any agent. Each part
// is one Frame; stats and coaching points are panels inside it.

/** agentId is an agent id, or "me" for the signed-in agent. */
export function ScorecardPage({ agentId }: { agentId: string }) {
  const card = useQuery(scorecardQuery(agentId));
  if (card.isPending) return <Loading />;
  if (card.isError) return <ErrorState error={card.error} title="Could not load the scorecard" />;
  return <ScorecardView card={card.data} self={agentId === "me"} />;
}

export function ScorecardView({ card, self }: { card: Scorecard; self: boolean }) {
  const title = self ? "My scorecard" : `${card.agent.name}'s scorecard`;
  if (card.callsScored === 0 && card.recentCalls.length === 0) {
    return (
      <>
        <PageHeader title={title} description={card.agent.teamName} />
        <EmptyState
          title="No calls scored yet"
          description="The scorecard fills in once calls have been scored."
        />
      </>
    );
  }
  const stats = [
    { label: "Calls scored", value: String(card.callsScored) },
    {
      label: "Average score",
      value: card.avgOverall === null ? "No data yet" : `${card.avgOverall.toFixed(0)}%`,
    },
    { label: "Prohibited statements", value: String(card.prohibitedCount) },
    { label: "Average talk ratio", value: formatPercent(card.avgTalkRatio) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={`${card.agent.teamName} · coaching points cover the last 90 days`}
      />

      <Frame>
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          {stats.map((s) => (
            <FramePanel key={s.label} className="px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-heading text-xl font-semibold tabular-nums">{s.value}</p>
            </FramePanel>
          ))}
        </div>
      </Frame>

      <Frame role="region" aria-labelledby="coaching-heading">
        <FrameHeader className="px-4 py-2.5">
          <FrameTitle role="heading" aria-level={2} id="coaching-heading">
            {self ? "Your top three things to work on" : "Top three coaching points"}
          </FrameTitle>
        </FrameHeader>
        {card.coaching.length === 0 ? (
          <FramePanel className="px-4 py-3 text-sm text-muted-foreground">
            Nothing missed in the last 90 days. Keep it up.
          </FramePanel>
        ) : (
          <ol className="grid gap-1 md:grid-cols-3">
            {card.coaching.map((c, i) => (
              <li key={c.key} className="flex">
                <FramePanel className="w-full px-4 py-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {c.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Missed or breached on {c.misses} call{c.misses > 1 ? "s" : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.examples.map((e) => (
                      <li key={e.callId}>
                        {e.note ?? "See the call"}{" "}
                        <Link
                          to="/calls/$callId"
                          params={{ callId: e.callId }}
                          className="underline underline-offset-4"
                        >
                          Open call
                        </Link>
                      </li>
                    ))}
                  </ul>
                </FramePanel>
              </li>
            ))}
          </ol>
        )}
      </Frame>

      <Frame role="region" aria-labelledby="items-heading">
        <FrameHeader className="px-4 py-2.5">
          <FrameTitle role="heading" aria-level={2} id="items-heading">
            Pass rate by rubric item
          </FrameTitle>
        </FrameHeader>
        <FramePanel className="grid gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-2">
          {card.items.map((item) => (
            <Meter
              key={item.key}
              value={item.passRate === null ? 0 : item.passRate * 100}
              aria-label={`${item.label} pass rate`}
              className="gap-1"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <MeterLabel>
                  {item.label}{" "}
                  {item.type === "prohibited" ? (
                    <Badge variant="outline" size="sm">
                      never say
                    </Badge>
                  ) : null}
                </MeterLabel>
                {item.passRate === null ? (
                  <span className="text-muted-foreground">No data yet</span>
                ) : (
                  <MeterValue />
                )}
              </div>
              <MeterTrack>
                <MeterIndicator />
              </MeterTrack>
            </Meter>
          ))}
        </FramePanel>
      </Frame>

      <Frame role="region" aria-labelledby="recent-heading">
        <FrameHeader className="px-4 py-2.5">
          <FrameTitle role="heading" aria-level={2} id="recent-heading">
            Recent calls
          </FrameTitle>
        </FrameHeader>
        <CallsTable calls={card.recentCalls} showAgent={false} />
      </Frame>
    </div>
  );
}

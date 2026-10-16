import {
  CALL_GROUPS,
  CALL_STATUSES,
  type CallGroup,
  FLAGS,
  LANGUAGES,
  type Reference,
} from "@scc/shared";
import { ArchiveIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { STATUS_LABEL } from "@/lib/format";

import { type CallsSearch, FLAG_LABEL, hasFilters } from "./calls-search";

const ALL = "all";
const SEARCH_DELAY_MS = 300;

const GROUP_LABEL: Record<CallGroup, string> = {
  agent: "Agent",
  team: "Team",
  product: "Product",
  language: "Language",
  status: "Status",
  flag: "Flag",
};

/** pick turns a select's value into a filter: "all" clears it, anything else must be one of the allowed values. */
function pick<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.find((v) => v === value);
}

/**
 * CallsToolbar: search, filters, grouping and the archived switch for a calls
 * table. Every change goes back to page 1. Team, product and agent filters
 * need the reference lists, which sales agents do not get.
 */
export function CallsToolbar({
  search,
  onChange,
  reference,
  local = false,
}: {
  search: CallsSearch;
  onChange: (next: CallsSearch) => void;
  reference: Reference | undefined;
  /** The queue filters in the browser: no team or product (not on its rows), no archived calls. */
  local?: boolean;
}) {
  const [text, setText] = useState(search.q ?? "");
  const set = (patch: Partial<CallsSearch>) => {
    onChange({ ...search, ...patch, page: undefined });
  };

  // Typing settles before the URL changes, so each keystroke is not a request.
  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === search.q) return;
    const timer = setTimeout(() => {
      onChange({ ...search, q: next, page: undefined });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, search, onChange]);

  const select = (
    label: string,
    value: string | undefined,
    options: { value: string; label: string }[],
    onPick: (value: string) => void,
    width = "w-36",
  ) => (
    <OptionSelect
      size="sm"
      label={label}
      value={value ?? ALL}
      className={width}
      options={[{ value: ALL, label: `All ${label.toLowerCase()}` }, ...options]}
      onChange={onPick}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          size="sm"
          type="search"
          aria-label="Search calls"
          placeholder="Search file, agent, team, product"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
      </InputGroup>
      {select(
        "Statuses",
        search.status,
        CALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
        (v) => {
          set({ status: pick(v, CALL_STATUSES) });
        },
      )}
      {select(
        "Flags",
        search.flag,
        FLAGS.map((f) => ({ value: f, label: FLAG_LABEL[f] })),
        (v) => {
          set({ flag: pick(v, FLAGS) });
        },
        "w-32",
      )}
      {reference
        ? select(
            "Agents",
            search.agentId,
            reference.agents.map((a) => ({ value: a.id, label: a.name })),
            (v) => {
              set({ agentId: v === ALL ? undefined : v });
            },
            "w-40",
          )
        : null}
      {reference && !local
        ? select(
            "Teams",
            search.teamId,
            reference.teams.map((t) => ({ value: t.id, label: t.name })),
            (v) => {
              set({ teamId: v === ALL ? undefined : v });
            },
            "w-40",
          )
        : null}
      {reference && !local
        ? select(
            "Products",
            search.productId,
            reference.products.map((p) => ({ value: p.id, label: p.name })),
            (v) => {
              set({ productId: v === ALL ? undefined : v });
            },
            "w-36",
          )
        : null}
      {select(
        "Languages",
        search.language,
        LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
        (v) => {
          set({
            language: pick(
              v,
              LANGUAGES.map((l) => l.code),
            ),
          });
        },
      )}
      <OptionSelect
        size="sm"
        label="Group by"
        value={search.groupBy ?? "none"}
        className="w-40"
        options={[
          { value: "none", label: "No grouping" },
          ...CALL_GROUPS.filter((g) => !local || (g !== "team" && g !== "product")).map((g) => ({
            value: g,
            label: `Group by ${GROUP_LABEL[g].toLowerCase()}`,
          })),
        ]}
        onChange={(v) => {
          onChange({ ...search, groupBy: pick(v, CALL_GROUPS), page: undefined });
        }}
      />
      {!local ? (
        <Toggle
          variant="outline"
          size="sm"
          aria-label="Show archived calls"
          pressed={search.archived === true}
          onPressedChange={(pressed) => {
            set({ archived: pressed ? true : undefined });
          }}
        >
          <ArchiveIcon aria-hidden="true" />
          Archived
        </Toggle>
      ) : null}
      {search.batchId ? (
        <Button
          variant="secondary"
          size="sm"
          aria-label="Remove the batch filter"
          onClick={() => {
            set({ batchId: undefined });
          }}
        >
          One batch
          <XIcon aria-hidden="true" />
        </Button>
      ) : null}
      {hasFilters(search) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setText("");
            onChange({ groupBy: search.groupBy });
          }}
        >
          <XIcon aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

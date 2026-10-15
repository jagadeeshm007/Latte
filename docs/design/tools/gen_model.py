# ruff: noqa: C408
"""Generates schema.sql, data-dictionary.csv, erd.md and the table sections of
data-model.md from one definition, so the four views cannot drift.
Run: python3 docs/design/tools/gen_model.py"""

import csv
import os
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)

ENUMS = [
    (
        "user_role",
        ["qa_reviewer", "agent", "manager"],
        "the three roles the PRD names (REQ-001); a new role is a product decision",
    ),
    (
        "call_status",
        ["uploaded", "transcribing", "transcribed", "scoring", "scored", "failed"],
        "the pipeline states of US-01-001 to US-01-003; each is a step a job moves",
    ),
    (
        "speaker_channel",
        ["agent", "customer"],
        "stereo has two channels, left agent and right customer (REQ-005)",
    ),
    (
        "rubric_item_type",
        ["mandatory", "prohibited", "quality"],
        "the three item kinds the spec lists (REQ-011 to REQ-013)",
    ),
    (
        "finding_status",
        ["met", "missed", "partial", "breach", "clear", "not_applicable"],
        "met, missed and partial for mandatory and quality items; breach and clear for prohibited items; not_applicable when the call gives no occasion",
    ),
    (
        "finding_source",
        ["llm", "rule", "reviewer"],
        "who produced the finding: the judge, the rule net (tenet 3) or a QA reviewer adding a miss (Q-008)",
    ),
    (
        "review_status",
        ["not_required", "pending", "done"],
        "routing state of US-01-005 and US-01-006",
    ),
    (
        "review_decision",
        ["agree", "disagree"],
        "the two choices REQ-018 gives a reviewer",
    ),
    (
        "model_kind",
        ["chat", "stt", "tts"],
        "the three kinds of model call the gateway makes (ADR-0005 to ADR-0007)",
    ),
    (
        "model_call_status",
        ["ok", "error", "refused"],
        "refused records a budget refusal (AC-US-02-001-5) as well as success and failure",
    ),
]


def c(
    name,
    typ,
    null=False,
    key="",
    default="",
    ref="",
    ondel="",
    pii="No",
    desc="",
    why="",
):
    return dict(
        name=name,
        type=typ,
        null=null,
        key=key,
        default=default,
        ref=ref,
        ondel=ondel,
        pii=pii,
        desc=desc,
        why=why,
    )


def ID(what):
    return c(
        "id",
        "uuid",
        key="PK",
        default="gen_random_uuid()",
        desc=f"Identifier of the {what}",
        why="every row needs a stable id that does not leak counts",
    )


CREATED = c(
    "created_at",
    "timestamptz",
    default="now()",
    desc="When the row was created",
    why="audit and ordering by recency",
)
UPDATED = c(
    "updated_at",
    "timestamptz",
    default="now()",
    desc="When the row last changed",
    why="audit of edits; set by the application on every update",
)

TABLES = [
    dict(
        name="teams",
        title="Teams",
        hot="no",
        serves="US-01-001, US-01-008",
        volume="10^1 to 10^2 rows; one per sales team",
        purpose="Sales teams calls are grouped by, for upload metadata and the manager dashboard.",
        cols=[
            ID("team"),
            c(
                "name",
                "text",
                key="UQ",
                desc="Team name as managers know it",
                why="AC-US-01-001-1 records the team; AC-US-01-008-1 groups by it",
            ),
            CREATED,
        ],
        indexes=[
            (
                "uq_teams_name",
                "UNIQUE",
                "(name)",
                "lookup and de-duplication of team names on upload",
            )
        ],
        checks=[
            (
                "chk_teams_name_not_blank",
                "length(btrim(name)) > 0",
                "a team named with spaces only",
            )
        ],
    ),
    dict(
        name="products",
        title="Products",
        hot="no",
        serves="US-01-001, US-01-008",
        volume="10^1 rows; one per insurance product",
        purpose="Products a call is about, for upload metadata and the dashboard.",
        cols=[
            ID("product"),
            c(
                "name",
                "text",
                key="UQ",
                desc="Product name",
                why="AC-US-01-001-1 records the product; AC-US-01-008-1 groups by it",
            ),
            CREATED,
        ],
        indexes=[("uq_products_name", "UNIQUE", "(name)", "lookup by name on upload")],
        checks=[
            (
                "chk_products_name_not_blank",
                "length(btrim(name)) > 0",
                "a product named with spaces only",
            )
        ],
    ),
    dict(
        name="agents",
        title="Sales agents",
        hot="no",
        serves="US-01-001, US-00-001, US-00-002",
        volume="10^2 to 10^3 rows; one per sales agent",
        purpose="Sales agents whose calls are scored; separate from login profiles because agents can be scored before they have an account.",
        cols=[
            ID("agent"),
            c(
                "team_id",
                "uuid",
                key="FK",
                ref="teams.id",
                ondel="RESTRICT",
                desc="Team the agent belongs to",
                why="AC-US-01-008-1 groups by team; a team with agents cannot be deleted",
            ),
            c(
                "name",
                "text",
                pii="Yes",
                desc="Agent display name",
                why="AC-US-01-001-1 records the agent on each call",
            ),
            c(
                "external_code",
                "text",
                null=True,
                key="UQ",
                desc="Agent code from the distributor's HR system",
                why="uploads name agents by code to avoid duplicate names",
            ),
            CREATED,
        ],
        indexes=[
            ("idx_agents_team_id", "", "(team_id)", "list agents of a team; FK index"),
            (
                "uq_agents_external_code",
                "UNIQUE",
                "(external_code)",
                "match an uploaded agent code to one agent",
            ),
        ],
        checks=[
            (
                "chk_agents_name_not_blank",
                "length(btrim(name)) > 0",
                "an agent with an empty name",
            )
        ],
    ),
    dict(
        name="profiles",
        title="User profiles",
        hot="no",
        serves="US-00-003, US-00-001",
        volume="10^2 to 10^3 rows; one per signed-in user",
        purpose="The role and agent link of each Supabase Auth user; the API reads it on every request.",
        cols=[
            c(
                "id",
                "uuid",
                key="PK",
                desc="The Supabase Auth user id (JWT sub)",
                why="AC-US-00-003-1 maps a signed-in user to a role; the id is issued by Auth, not generated here",
            ),
            c(
                "email",
                "text",
                key="UQ",
                pii="Yes",
                desc="Sign-in email, copied from Auth for display",
                why="reviewers are named on decisions (AC-US-01-006-2)",
            ),
            c(
                "display_name",
                "text",
                pii="Yes",
                desc="Name shown in the UI",
                why="the review record shows who decided (AC-US-01-006-2)",
            ),
            c(
                "role",
                "user_role",
                desc="The user's single role",
                why="REQ-001: one role per user decides every permission",
            ),
            c(
                "agent_id",
                "uuid",
                null=True,
                key="FK",
                ref="agents.id",
                ondel="RESTRICT",
                desc="Agent record of a user whose role is agent",
                why="AC-US-00-001-2: an agent reads only calls of their own agent record",
            ),
            CREATED,
            UPDATED,
        ],
        indexes=[
            (
                "uq_profiles_email",
                "UNIQUE",
                "(lower(email))",
                "one profile per email, case-insensitive",
            ),
            (
                "uq_profiles_agent_id",
                "UNIQUE",
                "(agent_id) WHERE agent_id IS NOT NULL",
                "one login per agent record; FK index",
            ),
        ],
        checks=[
            (
                "chk_profiles_agent_link",
                "(role = 'agent') = (agent_id IS NOT NULL)",
                "an agent profile with no agent record, or a manager linked to one",
            )
        ],
    ),
    dict(
        name="rubrics",
        title="Rubric versions",
        hot="no",
        serves="US-01-003, US-01-004",
        volume="10^1 to 10^2 rows; one per rubric edit",
        purpose="Versioned rubrics; exactly one active version scores new calls, and old scores keep the version they used (Q-006).",
        cols=[
            ID("rubric version"),
            c(
                "version",
                "integer",
                key="UQ",
                desc="Monotonic version number",
                why="AC-US-01-004-2: scores show the version they were judged by",
            ),
            c(
                "name",
                "text",
                desc="Human name of the rubric",
                why="managers tell versions apart in the rubric screen (US-01-004)",
            ),
            c(
                "items",
                "jsonb",
                desc="Rubric items: key, type, label, description, examples",
                why="AC-US-01-004-1: a manager edits items; the scorer reads them (US-01-003)",
            ),
            c(
                "is_active",
                "boolean",
                default="false",
                desc="Whether this version scores new calls",
                why="AC-US-01-004-1: the saved version becomes active",
            ),
            c(
                "created_by",
                "uuid",
                null=True,
                key="FK",
                ref="profiles.id",
                ondel="SET NULL",
                desc="Manager who saved the version; null for the seeded default",
                why="audit of who changed the compliance rubric",
            ),
            CREATED,
        ],
        indexes=[
            ("uq_rubrics_version", "UNIQUE", "(version)", "fetch a version by number"),
            (
                "uq_rubrics_active",
                "UNIQUE",
                "(is_active) WHERE is_active",
                "at most one active rubric; the scorer reads it",
            ),
            ("idx_rubrics_created_by", "", "(created_by)", "FK index"),
        ],
        checks=[
            (
                "chk_rubrics_items_array",
                "jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0",
                "a rubric with no items",
            )
        ],
    ),
    dict(
        name="calls",
        title="Calls",
        hot="yes",
        serves="US-01-001, US-01-002, US-01-005, US-00-001, US-01-008, US-02-003",
        volume="10^5 a year at 20,000 calls a month; driven by upload volume",
        purpose="One uploaded recording and its pipeline state.",
        cols=[
            ID("call"),
            c(
                "agent_id",
                "uuid",
                key="FK",
                ref="agents.id",
                ondel="RESTRICT",
                desc="Agent on the left channel",
                why="AC-US-01-001-1 records the agent; tenet 4 filters agent reads by it",
            ),
            c(
                "team_id",
                "uuid",
                key="FK",
                ref="teams.id",
                ondel="RESTRICT",
                desc="Team at the time of the call",
                why="AC-US-01-001-1 records team per call; agents can move teams later",
            ),
            c(
                "product_id",
                "uuid",
                key="FK",
                ref="products.id",
                ondel="RESTRICT",
                desc="Product discussed",
                why="AC-US-01-001-1 records the product; AC-US-01-008-1 groups by it",
            ),
            c(
                "call_date",
                "date",
                desc="Date the call took place",
                why="AC-US-01-001-1 records the date; AC-US-01-008-2 filters by range",
            ),
            c(
                "batch_id",
                "uuid",
                desc="Upload batch shared by files uploaded together",
                why="AC-US-01-001-2: one batch id per multi-file upload",
            ),
            c(
                "uploaded_by",
                "uuid",
                key="FK",
                ref="profiles.id",
                ondel="RESTRICT",
                desc="QA reviewer or manager who uploaded",
                why="audit of who put the recording in (Q-002)",
            ),
            c(
                "original_filename",
                "text",
                pii="Yes",
                desc="File name as uploaded",
                why="reviewers recognise calls by their source file; file names often carry customer names",
            ),
            c(
                "mime_type",
                "text",
                desc="audio/wav or audio/mpeg",
                why="AC-US-01-001-3 refuses other types; the decoder is chosen by it",
            ),
            c(
                "size_bytes",
                "bigint",
                desc="File size",
                why="AC-US-01-001-3 refuses files over 50 MB, the Supabase per-file cap",
            ),
            c(
                "storage_path",
                "text",
                null=True,
                desc="Object path in the private recordings bucket; null once purged",
                why="AC-US-02-003-2 signs a URL for it; AC-US-02-003-4 clears it on purge",
            ),
            c(
                "duration_ms",
                "integer",
                null=True,
                desc="Recording length, known after decoding",
                why="talk ratio and scaling numbers need call length (REQ-014)",
            ),
            c(
                "status",
                "call_status",
                default="'uploaded'",
                desc="Pipeline state",
                why="AC-US-01-002-1 and AC-US-01-002-2 move it; the call list shows it",
            ),
            c(
                "error",
                "text",
                null=True,
                desc="Reason the call failed, safe to show users",
                why="AC-US-01-001-4 and AC-US-01-002-5 show why a call failed",
            ),
            c(
                "retention_until",
                "date",
                desc="Date after which the audio is purged",
                why="AC-US-02-003-4: the purge job deletes audio past this date (Q-004)",
            ),
            c(
                "audio_purged_at",
                "timestamptz",
                null=True,
                desc="When the audio was deleted",
                why="AC-US-02-003-4: transcript stays, the UI shows audio is gone",
            ),
            CREATED,
            UPDATED,
        ],
        indexes=[
            (
                "idx_calls_agent_id_created_at",
                "",
                "(agent_id, created_at DESC)",
                "agent scorecard and own call list (US-00-001); FK index",
            ),
            (
                "idx_calls_team_id_call_date",
                "",
                "(team_id, call_date)",
                "dashboard by team and date range (US-01-008); FK index",
            ),
            (
                "idx_calls_product_id_call_date",
                "",
                "(product_id, call_date)",
                "dashboard by product and date range (US-01-008); FK index",
            ),
            (
                "idx_calls_status_created_at",
                "",
                "(status, created_at DESC)",
                "call list filtered by status",
            ),
            ("idx_calls_batch_id", "", "(batch_id)", "show an upload batch"),
            (
                "uq_calls_storage_path",
                "UNIQUE",
                "(storage_path) WHERE storage_path IS NOT NULL",
                "one call per uploaded object, so a repeated confirm cannot spend the budget twice (migration 0002)",
            ),
            ("idx_calls_uploaded_by", "", "(uploaded_by)", "FK index"),
            (
                "idx_calls_retention_until",
                "",
                "(retention_until) WHERE audio_purged_at IS NULL",
                "purge job finds calls due; the query must repeat WHERE audio_purged_at IS NULL",
            ),
        ],
        checks=[
            (
                "chk_calls_mime_type",
                "mime_type IN ('audio/wav', 'audio/mpeg')",
                "a file that is not WAV or MP3 (AC-US-01-001-3)",
            ),
            (
                "chk_calls_size_bytes",
                "size_bytes > 0 AND size_bytes <= 52428800",
                "an empty file or one over 50 MB (Q-001)",
            ),
            (
                "chk_calls_failed_has_error",
                "(status = 'failed') = (error IS NOT NULL)",
                "a failed call with no reason, or an error left on a healthy call",
            ),
            (
                "chk_calls_purged_has_no_path",
                "audio_purged_at IS NULL OR storage_path IS NULL",
                "a purged call still pointing at audio",
            ),
        ],
    ),
    dict(
        name="transcript_segments",
        title="Transcript segments",
        hot="yes",
        serves="US-01-002, US-01-003, US-01-006",
        volume="10^6 to 10^7 a year: about 100 per call",
        purpose="Timestamped text per channel; the source of every finding's quote and time (tenet 2).",
        cols=[
            c(
                "id",
                "bigint",
                key="PK",
                default="generated always as identity",
                desc="Row id",
                why="high-volume child rows; a bigint keeps the index small",
            ),
            c(
                "call_id",
                "uuid",
                key="FK",
                ref="calls.id",
                ondel="CASCADE",
                desc="Call the segment belongs to",
                why="AC-US-01-002-2 saves segments per call",
            ),
            c(
                "seq",
                "integer",
                desc="Order of the segment in the call, both channels merged by start time",
                why="the judge cites segments by number (US-01-003); findings point at it",
            ),
            c(
                "channel",
                "speaker_channel",
                desc="Agent or customer",
                why="AC-US-01-001-5 labels left as agent and right as customer",
            ),
            c(
                "start_ms",
                "integer",
                desc="Start in call time, milliseconds",
                why="AC-US-01-002-3: times match the recording; AC-US-01-006-1 seeks to it",
            ),
            c(
                "end_ms",
                "integer",
                desc="End in call time, milliseconds",
                why="talk ratio sums segment durations (AC-US-01-003-4)",
            ),
            c(
                "text",
                "text",
                pii="Yes",
                desc="Transcribed words",
                why="the judge reads it and quotes are matched against it (AC-US-01-003-6)",
            ),
            c(
                "language",
                "text",
                null=True,
                desc="Language Whisper detected for the chunk",
                why="AC-US-01-002-4 saves the detected language",
            ),
            c(
                "avg_logprob",
                "real",
                null=True,
                desc="Whisper confidence for the segment",
                why="low-confidence text is shown dimmed so reviewers distrust it",
            ),
            CREATED,
        ],
        indexes=[
            (
                "uq_transcript_segments_call_id_seq",
                "UNIQUE",
                "(call_id, seq)",
                "load a call's transcript in order; FK index; grounding by seq",
            )
        ],
        checks=[
            (
                "chk_transcript_segments_times",
                "start_ms >= 0 AND end_ms >= start_ms",
                "a segment ending before it starts",
            )
        ],
    ),
    dict(
        name="model_calls",
        title="Model calls",
        hot="yes",
        serves="US-02-001, US-01-003",
        volume="10^5 a year: about 3 per call (transcription chunks, one judge call)",
        purpose="One row per gateway call: the cost log and the budget total.",
        cols=[
            ID("model call"),
            c(
                "provider",
                "text",
                desc="groq, openrouter or gemini",
                why="AC-US-02-001-2: provider is configuration; cost depends on it",
            ),
            c(
                "model",
                "text",
                desc="Model id sent to the provider",
                why="AC-US-02-001-4 records the model",
            ),
            c(
                "kind",
                "model_kind",
                desc="chat, stt or tts",
                why="cost is computed differently per kind (AC-US-02-001-4)",
            ),
            c(
                "purpose",
                "text",
                desc="What the call was for: score, transcribe, seed_tts, eval",
                why="spend is reported by purpose on the usage page",
            ),
            c(
                "call_id",
                "uuid",
                null=True,
                key="FK",
                ref="calls.id",
                ondel="SET NULL",
                desc="Call the model call served, if any",
                why="AC-US-01-003-1 counts chat calls per call",
            ),
            c(
                "status",
                "model_call_status",
                desc="ok, error or refused",
                why="AC-US-02-001-5 records refusals; failed calls still cost",
            ),
            c(
                "input_tokens",
                "integer",
                default="0",
                desc="Prompt tokens billed",
                why="AC-US-02-001-4 logs tokens",
            ),
            c(
                "cached_tokens",
                "integer",
                default="0",
                desc="Prompt tokens served from cache at half price",
                why="cost is exact only with cached tokens priced apart",
            ),
            c(
                "output_tokens",
                "integer",
                default="0",
                desc="Completion tokens, reasoning included",
                why="AC-US-02-001-4 logs tokens; the 1000 cap applies to them",
            ),
            c(
                "audio_seconds",
                "numeric(10,2)",
                default="0",
                desc="Billed audio seconds for transcription",
                why="Whisper is billed per audio hour with a 10 s minimum",
            ),
            c(
                "characters",
                "integer",
                default="0",
                desc="Characters voiced for TTS",
                why="Orpheus is billed per character",
            ),
            c(
                "cost_usd",
                "numeric(12,6)",
                default="0",
                desc="Cost of this call in US dollars",
                why="AC-US-02-001-5: the budget is the sum of this column",
            ),
            c(
                "latency_ms",
                "integer",
                default="0",
                desc="Wall time of the request",
                why="operators see slow provider periods on the usage page",
            ),
            c(
                "error",
                "text",
                null=True,
                desc="Provider or gateway error summary, no content",
                why="explains failed and refused rows",
            ),
            CREATED,
        ],
        indexes=[
            ("idx_model_calls_call_id", "", "(call_id)", "FK index; calls per call"),
            (
                "idx_model_calls_created_at",
                "",
                "(created_at)",
                "usage per day on the manager page",
            ),
        ],
        checks=[
            (
                "chk_model_calls_nonnegative",
                "input_tokens >= 0 AND cached_tokens >= 0 AND output_tokens >= 0 AND audio_seconds >= 0 AND characters >= 0 AND cost_usd >= 0",
                "a negative usage or cost that would shrink the budget total",
            ),
            (
                "chk_model_calls_output_cap",
                "output_tokens <= 1000",
                "a completion longer than the 1000-token cap (REQ-024)",
            ),
        ],
    ),
    dict(
        name="scores",
        title="Scores",
        hot="yes",
        serves="US-01-003, US-01-005, US-01-006, US-00-001, US-00-002",
        volume="10^5 a year: one per scored call",
        purpose="The current judgement of a call: talk ratio, coaching notes and QA routing. A rescore replaces it while review is not done.",
        cols=[
            ID("score"),
            c(
                "call_id",
                "uuid",
                key="FK",
                ref="calls.id",
                ondel="CASCADE",
                desc="Scored call; one current score each",
                why="AC-US-01-003-1: a scored call has one judgement",
            ),
            c(
                "rubric_id",
                "uuid",
                key="FK",
                ref="rubrics.id",
                ondel="RESTRICT",
                desc="Rubric version used",
                why="AC-US-01-004-2: scores keep their version",
            ),
            c(
                "model_call_id",
                "uuid",
                null=True,
                key="FK",
                ref="model_calls.id",
                ondel="SET NULL",
                desc="The judge call that produced it",
                why="AC-US-01-003-1 ties the one chat call to the score",
            ),
            c(
                "overall_score",
                "numeric(5,2)",
                null=True,
                desc="Percent of applicable mandatory and quality items met, zero if any breach; null when the judge failed",
                why="the scorecard shows a score per call (AC-US-00-001-1)",
            ),
            c(
                "judge_status",
                "text",
                desc="ok when the judge produced valid findings, failed otherwise",
                why="a call whose judge failed still reaches QA as unscored with its rule findings (REQ-017, HLD review)",
            ),
            c(
                "judge_error",
                "text",
                null=True,
                desc="Why the judge failed, safe to show reviewers",
                why="reviewers see why a queued call is unscored",
            ),
            c(
                "talk_ratio",
                "numeric(4,3)",
                desc="Agent speech time over total speech time",
                why="AC-US-01-003-4: computed in code (REQ-014)",
            ),
            c(
                "coaching_notes",
                "jsonb",
                default="'[]'::jsonb",
                desc="Up to three notes from the judge",
                why="AC-US-00-002-2 shows them per call",
            ),
            c(
                "needs_review",
                "boolean",
                desc="Whether routing sent the call to QA",
                why="AC-US-01-005-1 to AC-US-01-005-3",
            ),
            c(
                "review_status",
                "review_status",
                desc="not_required, pending or done",
                why="AC-US-01-006-4: completing a review takes the call off the queue",
            ),
            c(
                "reviewed_by",
                "uuid",
                null=True,
                key="FK",
                ref="profiles.id",
                ondel="RESTRICT",
                desc="Reviewer who completed the review",
                why="audit of the human decision (AC-US-01-006-4)",
            ),
            c(
                "reviewed_at",
                "timestamptz",
                null=True,
                desc="When the review was completed",
                why="queue age and agreement over time",
            ),
            CREATED,
            UPDATED,
        ],
        indexes=[
            (
                "uq_scores_call_id",
                "UNIQUE",
                "(call_id)",
                "one current score per call; FK index",
            ),
            (
                "idx_scores_review_queue",
                "",
                "(created_at) WHERE review_status = 'pending'",
                "the QA queue, oldest first; the query must repeat WHERE review_status = 'pending'",
            ),
            ("idx_scores_rubric_id", "", "(rubric_id)", "FK index"),
            ("idx_scores_model_call_id", "", "(model_call_id)", "FK index"),
            ("idx_scores_reviewed_by", "", "(reviewed_by)", "FK index"),
        ],
        checks=[
            (
                "chk_scores_talk_ratio",
                "talk_ratio >= 0 AND talk_ratio <= 1",
                "a talk ratio outside 0 to 1",
            ),
            (
                "chk_scores_overall",
                "overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)",
                "a score outside 0 to 100",
            ),
            (
                "chk_scores_judge_status",
                "(judge_status = 'ok' AND judge_error IS NULL AND overall_score IS NOT NULL) OR (judge_status = 'failed' AND judge_error IS NOT NULL AND overall_score IS NULL AND needs_review)",
                "a failed judge with a score, or an unscored call kept out of the QA queue",
            ),
            (
                "chk_scores_routing",
                "(needs_review AND review_status <> 'not_required') OR (NOT needs_review AND review_status = 'not_required')",
                "a risky call marked not required, or a clean call in the queue",
            ),
            (
                "chk_scores_review_done",
                "(review_status = 'done') = (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)",
                "a done review with no reviewer, or a reviewer on an open one",
            ),
            (
                "chk_scores_notes_array",
                "jsonb_typeof(coaching_notes) = 'array' AND jsonb_array_length(coaching_notes) <= 3",
                "more than three coaching notes",
            ),
        ],
    ),
    dict(
        name="findings",
        title="Findings",
        hot="yes",
        serves="US-01-003, US-01-005, US-01-006, US-01-007, US-00-002, US-02-002",
        volume="10^6 a year: about 12 per call",
        purpose="One judgement on one rubric item for one call, with its evidence.",
        cols=[
            ID("finding"),
            c(
                "score_id",
                "uuid",
                key="FK",
                ref="scores.id",
                ondel="CASCADE",
                desc="Score the finding belongs to",
                why="a rescore replaces the score and its findings together",
            ),
            c(
                "call_id",
                "uuid",
                key="FK",
                ref="calls.id",
                ondel="CASCADE",
                desc="Call, copied from the score for direct reads",
                why="agent scorecard and coaching counts filter findings by the agent's calls (US-00-002)",
            ),
            c(
                "item_key",
                "text",
                desc="Rubric item key, such as guaranteed_returns",
                why="AC-US-01-007-1 groups agreement by item",
            ),
            c(
                "item_type",
                "rubric_item_type",
                desc="mandatory, prohibited or quality",
                why="routing reads it (AC-US-01-005-1 and AC-US-01-005-2)",
            ),
            c(
                "status",
                "finding_status",
                desc="met, missed, partial, breach, clear or not_applicable",
                why="AC-US-01-003-2 and AC-US-01-003-3",
            ),
            c(
                "source",
                "finding_source",
                desc="llm, rule or reviewer",
                why="AC-US-01-003-7 adds rule findings; AC-US-01-006-3 adds reviewer findings",
            ),
            c(
                "quote",
                "text",
                null=True,
                pii="Yes",
                desc="Words from the transcript that evidence the finding",
                why="REQ-015 links every finding to its quote",
            ),
            c(
                "segment_seq",
                "integer",
                null=True,
                desc="Transcript segment cited",
                why="tenet 2: times come from this segment",
            ),
            c(
                "start_ms",
                "integer",
                null=True,
                desc="Start of the evidence, copied from the segment",
                why="AC-US-01-006-1 seeks the player here",
            ),
            c(
                "end_ms",
                "integer",
                null=True,
                desc="End of the evidence, copied from the segment",
                why="the UI highlights the span",
            ),
            c(
                "channel",
                "speaker_channel",
                null=True,
                desc="Who said the quoted words",
                why="a breach by the agent differs from words the customer said",
            ),
            c(
                "rationale",
                "text",
                null=True,
                desc="Short reason from the judge or reviewer",
                why="reviewers decide faster with the judge's reason (US-01-006)",
            ),
            c(
                "grounded",
                "boolean",
                default="true",
                desc="Whether the quote matched the cited segment",
                why="AC-US-01-003-6 marks ungrounded findings and routes them",
            ),
            c(
                "created_by",
                "uuid",
                null=True,
                key="FK",
                ref="profiles.id",
                ondel="RESTRICT",
                desc="Reviewer who added a missed finding",
                why="AC-US-01-006-3 records who added it",
            ),
            CREATED,
        ],
        indexes=[
            (
                "idx_findings_score_id",
                "",
                "(score_id)",
                "FK index; load findings of a score",
            ),
            ("idx_findings_call_id", "", "(call_id)", "FK index; call detail"),
            (
                "idx_findings_item_key_source",
                "",
                "(item_key, source)",
                "agreement per item (US-01-007) and eval reports",
            ),
            (
                "uq_findings_llm_item",
                "UNIQUE",
                "(score_id, item_key) WHERE source = 'llm'",
                "one judge finding per item per score",
            ),
            ("idx_findings_created_by", "", "(created_by)", "FK index"),
        ],
        checks=[
            (
                "chk_findings_times",
                "(start_ms IS NULL AND end_ms IS NULL) OR (start_ms >= 0 AND end_ms >= start_ms)",
                "evidence ending before it starts",
            ),
            (
                "chk_findings_reviewer_source",
                "(source = 'reviewer') = (created_by IS NOT NULL)",
                "a reviewer finding with no reviewer, or a judge finding claiming one",
            ),
            (
                "chk_findings_status_fits_type",
                "(item_type = 'prohibited' AND status IN ('breach', 'clear', 'not_applicable')) OR (item_type <> 'prohibited' AND status IN ('met', 'missed', 'partial', 'not_applicable'))",
                "a prohibited item marked met, or a mandatory item marked breach",
            ),
        ],
    ),
    dict(
        name="finding_reviews",
        title="Finding reviews",
        hot="no",
        serves="US-01-006, US-01-007",
        volume="10^5 a year: findings of reviewed calls",
        purpose="A QA reviewer's agree or disagree on one finding.",
        cols=[
            ID("review"),
            c(
                "finding_id",
                "uuid",
                key="FK",
                ref="findings.id",
                ondel="CASCADE",
                desc="Finding decided on",
                why="AC-US-01-006-2: one decision per finding",
            ),
            c(
                "reviewer_id",
                "uuid",
                key="FK",
                ref="profiles.id",
                ondel="RESTRICT",
                desc="Reviewer who decided",
                why="AC-US-01-006-2 saves the reviewer",
            ),
            c("decision", "review_decision", desc="agree or disagree", why="REQ-018"),
            c(
                "note",
                "text",
                null=True,
                pii="Yes",
                desc="Optional reviewer note",
                why="AC-US-01-006-2 allows a note; notes may repeat call details",
            ),
            CREATED,
            UPDATED,
        ],
        indexes=[
            (
                "uq_finding_reviews_finding_id",
                "UNIQUE",
                "(finding_id)",
                "one decision per finding, changed in place; FK index",
            ),
            ("idx_finding_reviews_reviewer_id", "", "(reviewer_id)", "FK index"),
        ],
        checks=[
            (
                "chk_finding_reviews_note_length",
                "note IS NULL OR length(note) <= 2000",
                "an unbounded note",
            )
        ],
    ),
    dict(
        name="audit_events",
        title="Audit events",
        hot="no",
        serves="US-02-003",
        volume="10^5 to 10^6 a year: one per recording access",
        purpose="Who accessed which recording and when.",
        cols=[
            c(
                "id",
                "bigint",
                key="PK",
                default="generated always as identity",
                desc="Row id",
                why="append-only log; bigint keeps it compact",
            ),
            c(
                "actor_id",
                "uuid",
                null=True,
                key="FK",
                ref="profiles.id",
                ondel="RESTRICT",
                desc="User who acted; null for system jobs",
                why="AC-US-02-003-2: access is audited by user; the purge job has no user",
            ),
            c(
                "action",
                "text",
                desc="What happened, such as audio_url_issued",
                why="AC-US-02-003-2 names the access",
            ),
            c(
                "call_id",
                "uuid",
                null=True,
                key="FK",
                ref="calls.id",
                ondel="SET NULL",
                desc="Call acted on",
                why="trace which recording was accessed",
            ),
            CREATED,
        ],
        indexes=[
            (
                "idx_audit_events_call_id",
                "",
                "(call_id)",
                "FK index; access history of a call",
            ),
            (
                "idx_audit_events_actor_id_created_at",
                "",
                "(actor_id, created_at)",
                "FK index; a user's access history",
            ),
        ],
        checks=[
            (
                "chk_audit_events_action",
                "action IN ('audio_url_issued', 'call_uploaded', 'rubric_saved', 'review_completed', 'audio_purged', 'finding_decided', 'call_retried')",
                "an unknown action name",
            )
        ],
    ),
]


def coldef(col):
    t = col["type"]
    if col["default"] == "generated always as identity":
        return f"{col['name']} {t} GENERATED ALWAYS AS IDENTITY PRIMARY KEY"
    s = f"{col['name']} {t}"
    if col["key"] == "PK":
        s += " PRIMARY KEY"
    if not col["null"] and col["key"] != "PK":
        s += " NOT NULL"
    if col["default"]:
        s += f" DEFAULT {col['default']}"
    if col["ref"]:
        tb, cl = col["ref"].split(".")
        s += f" REFERENCES {tb} ({cl}) ON DELETE {col['ondel']}"
    return s


def sq(s):
    return s.replace("'", "''")


def schema():
    out = [
        "-- Sales Call Compliance: PostgreSQL 17 schema. Generated by docs/design/tools/gen_model.py.",
        "-- Applied as migration 0001. RLS is enabled with no policies: only the API's database role reads (ADR-0003).",
        "BEGIN;",
        "",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "",
    ]
    for name, vals, _ in ENUMS:
        out.append(f"CREATE TYPE {name} AS ENUM ({', '.join(repr(v) for v in vals)});")
    out.append("")
    for t in TABLES:
        out.append(f"-- Serves {t['serves']}")
        lines = [coldef(c_) for c_ in t["cols"]]
        lines += [f"CONSTRAINT {n} CHECK ({e})" for n, e, _ in t["checks"]]
        out.append(f"CREATE TABLE {t['name']} (\n  " + ",\n  ".join(lines) + "\n);")
        out.append(f"COMMENT ON TABLE {t['name']} IS '{sq(t['purpose'])}';")
        for c_ in t["cols"]:
            out.append(
                f"COMMENT ON COLUMN {t['name']}.{c_['name']} IS '{sq(c_['desc'])}';"
            )
        for n, kind, cols, _ in t["indexes"]:
            u = "UNIQUE " if kind == "UNIQUE" else ""
            if " WHERE " in cols:
                body, where = cols.split(" WHERE ", 1)
                out.append(f"CREATE {u}INDEX {n} ON {t['name']} {body} WHERE {where};")
            else:
                out.append(f"CREATE {u}INDEX {n} ON {t['name']} {cols};")
        out.append(f"ALTER TABLE {t['name']} ENABLE ROW LEVEL SECURITY;")
        out.append("")
    out.append("COMMIT;")
    return "\n".join(out) + "\n"


def dictionary():
    with open(os.path.join(OUT, "data-dictionary.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "Table",
                "Column",
                "Type",
                "Nullable",
                "Key",
                "Default",
                "References",
                "On Delete",
                "Personal Data",
                "Description",
                "Why",
            ]
        )
        for t in TABLES:
            for c_ in t["cols"]:
                w.writerow(
                    [
                        t["name"],
                        c_["name"],
                        c_["type"],
                        "Yes" if c_["null"] else "No",
                        c_["key"],
                        c_["default"],
                        c_["ref"],
                        c_["ondel"],
                        c_["pii"],
                        c_["desc"],
                        c_["why"],
                    ]
                )


def erd():
    lines = [
        "# ERD: Sales Call Compliance",
        "",
        "Generated by docs/design/tools/gen_model.py.",
        "",
        "```mermaid",
        "erDiagram",
    ]
    rels = []
    for t in TABLES:
        for c_ in t["cols"]:
            if c_["ref"]:
                parent = c_["ref"].split(".")[0]
                uniq = any(
                    n.startswith("uq_") and ix.startswith(f"({c_['name']})")
                    for n, _, ix, _ in t["indexes"]
                )
                card = (
                    ("|o--o|" if c_["null"] else "||--o|")
                    if uniq
                    else ("|o--o{" if c_["null"] else "||--o{")
                )
                rels.append((parent, t["name"], c_["name"], c_["null"], uniq))
                lines.append(f'  {parent} {card} {t["name"]} : "{c_["name"]}"')
    for t in TABLES:
        lines.append(f"  {t['name']} {{")
        for c_ in t["cols"]:
            k = {"PK": " PK", "FK": " FK", "UQ": " UK"}.get(c_["key"], "")
            lines.append(
                f"    {c_['type'].split('(')[0].replace(' ', '_')} {c_['name']}{k}"
            )
        lines.append("  }")
    lines += ["```", "", "## Relationships", ""]
    for parent, child, col, null, uniq in rels:
        many = "at most one" if uniq else "many"
        opt = "optionally belongs to" if null else "belongs to exactly one"
        lines.append(
            f"- Each `{child}` row {opt} `{parent}` through `{col}`; a `{parent}` row has {many} `{child}` rows."
        )
    Path(os.path.join(OUT, "erd.md")).write_text("\n".join(lines) + "\n")
    return rels


def tables_md():
    out = []
    for t in TABLES:
        out.append(f"### `{t['name']}`: {t['title']} (hot: {t['hot']})\n")
        out.append(f"{t['purpose']} Serves {t['serves']}. Volume: {t['volume']}.\n")
        out.append(
            "| Column | Type | Null | Key | Default | Description | Why |\n| --- | --- | --- | --- | --- | --- | --- |"
        )
        for c_ in t["cols"]:
            out.append(
                f"| {c_['name']} | {c_['type']} | {'yes' if c_['null'] else 'no'} | {c_['key']} | {c_['default']} | {c_['desc']} | {c_['why']} |"
            )
        out.append("\n**Indexes**\n")
        for n, _, cols, q in t["indexes"]:
            out.append(f"- `{n}` on {cols}: {q}.")
        out.append("\n**Constraints**\n")
        for n, _, bad in t["checks"]:
            out.append(f"- `{n}` refuses {bad}.")
        out.append("")
    return "\n".join(out)


def enums_md():
    rows = ["| Enum | Values | Why the set is closed |", "| --- | --- | --- |"]
    for n, vals, why in ENUMS:
        rows.append(f"| `{n}` | {', '.join(vals)} | {why} |")
    return "\n".join(rows)


if __name__ == "__main__":
    Path(os.path.join(OUT, "schema.sql")).write_text(schema())
    dictionary()
    rels = erd()
    Path(os.path.join(HERE, "tables.md.part")).write_text(tables_md())
    Path(os.path.join(HERE, "enums.md.part")).write_text(enums_md())
    ncols = sum(len(t["cols"]) for t in TABLES)
    nidx = sum(len(t["indexes"]) for t in TABLES)
    npii = sum(1 for t in TABLES for c_ in t["cols"] if c_["pii"] == "Yes")
    print(
        f"tables={len(TABLES)} columns={ncols} indexes={nidx} pii={npii} rels={len(rels)} enums={len(ENUMS)}"
    )

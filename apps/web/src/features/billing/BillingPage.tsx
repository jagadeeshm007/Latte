import type { BillingPrices, Statement } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, PencilIcon, PrinterIcon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { saveCsv } from "@/lib/download";
import { api, pricesQuery, statementQuery } from "@/lib/endpoints";

// Billing (ADR-0026): a usage statement per month, priced from the price
// list. No payments are taken; the statement is what to invoice from.

/** The last twelve months, newest first, as YYYY-MM. */
function recentMonths(now = new Date()): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
}

export function BillingPage() {
  const months = recentMonths();
  const [month, setMonth] = useState(months[0]?.value ?? "");
  const statement = useQuery(statementQuery(month));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="What each month's calls cost, priced from your price list. Latte takes no payment here."
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <OptionSelect
              size="sm"
              className="w-44"
              label="Month"
              value={month}
              options={months}
              onChange={setMonth}
            />
            <PricesDialog />
            <Button
              variant="outline"
              size="sm"
              disabled={!statement.data}
              onClick={() => {
                if (statement.data) downloadCsv(statement.data);
              }}
            >
              <DownloadIcon aria-hidden="true" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.print();
              }}
            >
              <PrinterIcon aria-hidden="true" />
              Print
            </Button>
          </div>
        }
      />
      {statement.isPending ? (
        <Loading label="Loading the statement" shape="table" />
      ) : statement.isError ? (
        <ErrorState error={statement.error} />
      ) : (
        <StatementView statement={statement.data} />
      )}
    </div>
  );
}

const amount = (n: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n);

function StatementView({ statement: s }: { statement: Statement }) {
  const currency = s.prices.currency;
  return (
    <>
      <Frame role="region" aria-labelledby="statement-heading">
        <FrameHeader className="flex-row flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="statement-heading">
            Statement, {s.from} to {s.to}
          </FrameTitle>
          <span className="text-2xl font-semibold tabular-nums">{amount(s.total, currency)}</span>
        </FrameHeader>
        <FramePanel className="overflow-x-auto p-0">
          <Table aria-label="Statement lines">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-end">Quantity</TableHead>
                <TableHead className="text-end">Unit price</TableHead>
                <TableHead className="text-end">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.lines.map((l) => (
                <TableRow key={l.label}>
                  <TableCell>{l.label}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {l.quantity.toLocaleString("en-IN")} {l.unit}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {amount(l.unitPrice, currency)}
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {amount(l.amount, currency)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-end font-medium">
                  Total
                </TableCell>
                <TableCell className="text-end font-semibold tabular-nums">
                  {amount(s.total, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </FramePanel>
      </Frame>
      <Frame role="region" aria-labelledby="usage-split-heading">
        <FrameHeader className="px-4 py-3">
          <FrameTitle role="heading" aria-level={2} id="usage-split-heading">
            Where the usage came from
          </FrameTitle>
        </FrameHeader>
        <FramePanel className="px-4 py-3">
          <Tabs defaultValue="team">
            <TabsList>
              <TabsTab value="team">By team</TabsTab>
              <TabsTab value="product">By product</TabsTab>
              <TabsTab value="key">By API key</TabsTab>
            </TabsList>
            {(
              [
                ["team", s.byTeam],
                ["product", s.byProduct],
                ["key", s.byApiKey],
              ] as const
            ).map(([tab, rows]) => (
              <TabsPanel key={tab} value={tab} className="pt-3">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calls scored this month.</p>
                ) : (
                  <Table aria-label={`Usage by ${tab}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-end">Calls</TableHead>
                        <TableHead className="text-end">Audio minutes</TableHead>
                        <TableHead className="text-end">Model spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.calls}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.audioMinutes}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            ${r.modelCostUsd.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsPanel>
            ))}
          </Tabs>
        </FramePanel>
      </Frame>
    </>
  );
}

function downloadCsv(s: Statement) {
  saveCsv(
    [
      ["Item", "Quantity", "Unit", "Unit price", "Amount", "Currency"],
      ...s.lines.map((l) => [
        l.label,
        l.quantity,
        l.unit,
        l.unitPrice,
        l.amount,
        s.prices.currency,
      ]),
      ["Total", null, null, null, s.total, s.prices.currency],
      [],
      ["Team", "Calls", "Audio minutes", "Model spend (USD)"],
      ...s.byTeam.map((r) => [r.name, r.calls, r.audioMinutes, r.modelCostUsd]),
    ],
    `latte-statement-${s.month}.csv`,
  );
}

function PricesDialog() {
  const prices = useQuery(pricesQuery);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BillingPrices | null>(null);
  const current = draft ?? prices.data ?? null;
  const save = useMutation({
    mutationFn: (p: BillingPrices) => api.setPrices(p),
    onSuccess: async () => {
      setOpen(false);
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
  const field = (key: keyof BillingPrices, label: string) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={key === "currency" ? "text" : "number"}
        step="any"
        value={current ? String(current[key]) : ""}
        onChange={(e) => {
          if (!current) return;
          setDraft({
            ...current,
            [key]: key === "currency" ? e.target.value.toUpperCase() : Number(e.target.value),
          });
        }}
      />
    </Field>
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon aria-hidden="true" />
        Prices
      </DialogTrigger>
      <DialogPopup>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (current) save.mutate(current);
          }}
        >
          <DialogHeader>
            <DialogTitle>Price list</DialogTitle>
            <DialogDescription>Applies to every statement, past months included.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-4 sm:grid-cols-2">
            {field("currency", "Currency (e.g. INR)")}
            {field("usdRate", "Currency per US dollar")}
            {field("perCall", "Per scored call")}
            {field("perAudioMinute", "Per audio minute")}
            {field("modelMarkupPct", "Markup on model spend (%)")}
            {save.isError ? (
              <Alert variant="error" role="alert" className="sm:col-span-2">
                <AlertDescription>{save.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={save.isPending} disabled={!current}>
              Save prices
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

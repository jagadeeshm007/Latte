import { ITEM_TYPES, type ItemType, rubricItemSchema, type RubricItem } from "@scc/shared";
import { useState, type ReactElement } from "react";

import { OptionSelect } from "@/components/OptionSelect";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { keyFor, TYPE_LABEL } from "./rubric-items";

/**
 * RubricItemDialog adds an item, or edits one when `item` is given: label,
 * type and what the judge looks for, checked against the shared schema.
 */
export function RubricItemDialog({
  item,
  takenKeys,
  trigger,
  open,
  onOpenChange,
  onSave,
}: {
  item?: RubricItem;
  takenKeys: string[];
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (item: RubricItem) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogPopup>
        {/* Keyed so each opening starts from the item, not from the last edit. */}
        {isOpen ? (
          <ItemForm
            key={item?.key ?? "new"}
            item={item}
            takenKeys={takenKeys}
            onSave={(saved) => {
              onSave(saved);
              setOpen(false);
            }}
          />
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}

function ItemForm({
  item,
  takenKeys,
  onSave,
}: {
  item: RubricItem | undefined;
  takenKeys: string[];
  onSave: (item: RubricItem) => void;
}) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [type, setType] = useState<ItemType>(item?.type ?? "mandatory");
  const [description, setDescription] = useState(item?.description ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof RubricItem, string>>>({});

  function submit() {
    const draft = {
      key: item?.key ?? keyFor(label.trim(), takenKeys),
      type,
      label: label.trim(),
      description: description.trim(),
    };
    const parsed = rubricItemSchema.safeParse(draft);
    if (!parsed.success) {
      const failed = new Set(parsed.error.issues.map((issue) => issue.path[0]));
      setErrors({
        ...(failed.has("label") ? { label: "Give the item a label, at most 60 characters" } : {}),
        ...(failed.has("description")
          ? { description: "Say what the judge looks for, at most 600 characters" }
          : {}),
      });
      return;
    }
    onSave(parsed.data);
  }

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <DialogHeader>
        <DialogTitle>{item ? `Edit ${item.label}` : "Add a rubric item"}</DialogTitle>
        <DialogDescription>
          The judge scores every call against each item. Changes apply once you save the rubric as a
          new version.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field invalid={errors.label !== undefined}>
          <FieldLabel>Label</FieldLabel>
          <Input
            value={label}
            maxLength={60}
            placeholder="Free look period"
            onChange={(e) => {
              setLabel(e.target.value);
            }}
          />
          {errors.label ? <FieldError match>{errors.label}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel>Type</FieldLabel>
          <OptionSelect
            label="Type"
            value={type}
            options={ITEM_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            onChange={(t) => {
              const next = ITEM_TYPES.find((x) => x === t);
              if (next) setType(next);
            }}
          />
        </Field>
        <Field invalid={errors.description !== undefined}>
          <FieldLabel>What the judge looks for</FieldLabel>
          <Textarea
            value={description}
            maxLength={600}
            rows={4}
            placeholder="The agent states the 30-day free look period and how to cancel within it."
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
          {errors.description ? <FieldError match>{errors.description}</FieldError> : null}
        </Field>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
        <Button type="submit">{item ? "Save item" : "Add item"}</Button>
      </DialogFooter>
    </form>
  );
}

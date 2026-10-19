import { ROLES, type Member, type Role } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";

import { OptionSelect } from "@/components/OptionSelect";
import { ErrorState, Loading, PageHeader } from "@/components/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Frame, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { api, meQuery, membersQuery, referenceQuery } from "@/lib/endpoints";

// Members (ADR-0024): Latte is invite-only. A manager invites people with a
// role; Supabase emails them a link. Turning an account off stops it signing
// in, whichever way it signs in, and stops the API keys it made.

const ROLE_LABEL: Record<Role, string> = {
  qa_reviewer: "QA reviewer",
  manager: "Manager",
  agent: "Sales agent",
};
const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export function MembersPage() {
  const members = useQuery(membersQuery);
  const me = useQuery(meQuery);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Who can use Latte, and as what. Only people invited here can sign in."
        actions={<InviteDialog />}
      />
      {members.isPending ? (
        <Loading label="Loading members" shape="table" />
      ) : members.isError ? (
        <ErrorState error={members.error} />
      ) : (
        <Frame>
          <FramePanel className="overflow-x-auto p-0">
            <Table aria-label="Members">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Can sign in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.items.map((m) => (
                  <MemberRow key={m.id} member={m} self={m.id === me.data?.id} />
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>
      )}
    </div>
  );
}

function MemberRow({ member, self }: { member: Member; self: boolean }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (patch: { role?: Role; disabled?: boolean }) => api.updateMember(member.id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
    onError: (e) =>
      toastManager.add({ type: "error", title: "Not changed", description: e.message }),
  });
  return (
    <TableRow className={member.disabledAt ? "text-muted-foreground" : undefined}>
      <TableCell>
        <span className="block font-medium">
          {member.displayName}
          {self ? (
            <Badge variant="outline" className="ms-2">
              You
            </Badge>
          ) : null}
        </span>
        <span className="block text-xs text-muted-foreground">{member.email}</span>
      </TableCell>
      <TableCell>
        {member.role === "agent" ? (
          <span className="text-sm">
            Sales agent{member.agentName ? `: ${member.agentName}` : ""}
          </span>
        ) : (
          <OptionSelect
            size="sm"
            className="w-40"
            label={`Role of ${member.displayName}`}
            value={member.role}
            options={roleOptions.filter((o) => o.value !== "agent")}
            onChange={(v) => {
              const role = ROLES.find((r) => r === v);
              if (role && role !== member.role) update.mutate({ role });
            }}
          />
        )}
      </TableCell>
      <TableCell>
        <Switch
          aria-label={`${member.displayName} can sign in`}
          checked={!member.disabledAt}
          disabled={self}
          onCheckedChange={(on) => {
            update.mutate({ disabled: !on });
          }}
        />
      </TableCell>
    </TableRow>
  );
}

function InviteDialog() {
  const queryClient = useQueryClient();
  const reference = useQuery(referenceQuery);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("qa_reviewer");
  const [agentId, setAgentId] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: () =>
      api.inviteMember({
        email: email.trim(),
        displayName: name.trim(),
        role,
        agentId: role === "agent" ? agentId : null,
      }),
    onSuccess: async () => {
      toastManager.add({ type: "success", title: "Invitation sent", description: email.trim() });
      setOpen(false);
      setEmail("");
      setName("");
      setRole("qa_reviewer");
      setAgentId(null);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
  const ready = email.includes("@") && name.trim() !== "" && (role !== "agent" || agentId !== null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlusIcon aria-hidden="true" />
        Invite someone
      </DialogTrigger>
      <DialogPopup>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) invite.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>
              They get an email to set up their sign-in, then use Latte as the role you pick.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Work email</FieldLabel>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                required
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Role</span>
              <OptionSelect
                label="Role"
                value={role}
                options={roleOptions}
                onChange={(v) => {
                  const next = ROLES.find((r) => r === v);
                  if (next) setRole(next);
                }}
              />
            </div>
            {role === "agent" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Their agent record</span>
                <OptionSelect
                  label="Agent record"
                  value={agentId}
                  placeholder="Choose the agent"
                  options={(reference.data?.agents ?? []).map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  onChange={setAgentId}
                />
              </div>
            ) : null}
            {invite.isError ? (
              <Alert variant="error" role="alert">
                <AlertDescription>{invite.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={invite.isPending} disabled={!ready}>
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

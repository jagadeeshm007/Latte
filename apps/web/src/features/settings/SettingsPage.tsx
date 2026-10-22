import type { Me, Role } from "@scc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState, Loading, PageHeader } from "@/components/states";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { toastManager } from "@/components/ui/toast";
import { changePassword, signOutEverywhere } from "@/features/auth/session";
import { api, meQuery } from "@/lib/endpoints";

import { DigestSettings } from "./DigestSettings";
import { SETTINGS_TABS, type SettingsTab } from "./settings-search";

const TAB_LABEL: Record<SettingsTab, string> = {
  profile: "Profile",
  security: "Security",
  notifications: "Notifications",
  appearance: "Appearance",
};

const ROLE_LABEL: Record<Role, string> = {
  qa_reviewer: "QA reviewer",
  agent: "Sales agent",
  manager: "Manager",
};

/** The shortest password this page accepts; Supabase may ask for more. */
const MIN_PASSWORD = 8;

/** SettingsPage: a person's own settings, whatever their role. */
export function SettingsPage({
  tab = "profile",
  onTab,
}: {
  tab?: SettingsTab | undefined;
  onTab: (tab: SettingsTab) => void;
}) {
  const me = useQuery(meQuery);
  if (me.isPending) return <Loading label="Loading your settings" />;
  if (me.isError) return <ErrorState error={me.error} title="Your settings could not be loaded" />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your name, sign-in, notifications and theme." />
      <Tabs
        value={tab}
        onValueChange={(v: unknown) => {
          const next = SETTINGS_TABS.find((t) => t === v);
          if (next) onTab(next);
        }}
      >
        <TabsList>
          {SETTINGS_TABS.map((t) => (
            <TabsTab key={t} value={t}>
              {TAB_LABEL[t]}
            </TabsTab>
          ))}
        </TabsList>
        <TabsPanel value="profile" className="max-w-2xl pt-4">
          <ProfileSettings me={me.data} />
        </TabsPanel>
        <TabsPanel value="security" className="flex max-w-2xl flex-col gap-4 pt-4">
          <PasswordSettings />
          <SessionSettings />
        </TabsPanel>
        <TabsPanel value="notifications" className="max-w-2xl pt-4">
          <DigestSettings />
        </TabsPanel>
        <TabsPanel value="appearance" className="max-w-2xl pt-4">
          <Frame>
            <FrameHeader className="px-4 py-3">
              <FrameTitle role="heading" aria-level={2}>
                Theme
              </FrameTitle>
              <FrameDescription>Light, dark, or the same as your computer.</FrameDescription>
            </FrameHeader>
            <FramePanel className="px-4 py-3">
              <ThemeToggle />
            </FramePanel>
          </Frame>
        </TabsPanel>
      </Tabs>
    </div>
  );
}

function ProfileSettings({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.displayName);
  const save = useMutation({
    mutationFn: () => api.updateMe({ displayName: name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(meQuery.queryKey, updated);
      setName(updated.displayName);
      toastManager.add({ type: "success", title: "Name saved", description: updated.displayName });
    },
  });
  const changed = name.trim() !== "" && name.trim() !== me.displayName;
  return (
    <Frame>
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2}>
          Profile
        </FrameTitle>
        <FrameDescription>
          Your name is shown on reviews, notes and the people list. A manager changes your role.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col gap-4 px-4 py-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) save.mutate();
          }}
        >
          <Field className="min-w-60 flex-1">
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
          <Button type="submit" disabled={!changed || save.isPending}>
            {save.isPending ? "Saving" : "Save"}
          </Button>
        </form>
        {save.isError ? (
          <Alert variant="error" role="alert">
            <AlertDescription>{save.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{me.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>{ROLE_LABEL[me.role]}</dd>
        </dl>
      </FramePanel>
    </Frame>
  );
}

function PasswordSettings() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: async () => {
      const error = await changePassword(password);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      setPassword("");
      setConfirm("");
      toastManager.add({ type: "success", title: "Password changed" });
    },
  });
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = password.length >= MIN_PASSWORD && confirm === password;
  return (
    <Frame>
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2}>
          Password
        </FrameTitle>
        <FrameDescription>
          For signing in with email. If you sign in with Google, Microsoft or your company's single
          sign-on, you do not need one.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="px-4 py-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) change.mutate();
          }}
        >
          <div className="flex flex-wrap gap-3">
            <Field className="min-w-56 flex-1">
              <FieldLabel>New password</FieldLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                aria-invalid={tooShort || undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </Field>
            <Field className="min-w-56 flex-1">
              <FieldLabel>Repeat it</FieldLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                aria-invalid={mismatch || undefined}
                onChange={(e) => {
                  setConfirm(e.target.value);
                }}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {tooShort
              ? `At least ${String(MIN_PASSWORD)} characters.`
              : mismatch
                ? "The two passwords are different."
                : `At least ${String(MIN_PASSWORD)} characters.`}
          </p>
          {change.isError ? (
            <Alert variant="error" role="alert">
              <AlertDescription>{change.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div>
            <Button type="submit" disabled={!ready || change.isPending}>
              {change.isPending ? "Changing" : "Change password"}
            </Button>
          </div>
        </form>
      </FramePanel>
    </Frame>
  );
}

function SessionSettings() {
  const [confirming, setConfirming] = useState(false);
  const signOut = useMutation({ mutationFn: signOutEverywhere });
  return (
    <Frame>
      <FrameHeader className="px-4 py-3">
        <FrameTitle role="heading" aria-level={2}>
          Signed-in devices
        </FrameTitle>
        <FrameDescription>
          Signs this account out on every browser and device, including this one. API keys are not
          affected.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-wrap items-center gap-2 px-4 py-3">
        {confirming ? (
          <>
            <Button
              variant="destructive"
              disabled={signOut.isPending}
              onClick={() => {
                signOut.mutate();
              }}
            >
              Yes, sign out everywhere
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setConfirming(true);
            }}
          >
            Sign out everywhere
          </Button>
        )}
      </FramePanel>
    </Frame>
  );
}

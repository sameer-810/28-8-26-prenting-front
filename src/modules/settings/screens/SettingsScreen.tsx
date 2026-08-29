import React, { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Bell,
  Clock,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Languages,
  Smartphone,
} from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useFontStore, type LanguageCode } from "@shared/fonts";
import { useAppNavigation } from "@navigation/types";
import {
  Screen,
  Text,
  Button,
  Card,
  Select,
  VStack,
  HStack,
  Banner,
  Chip,
  ListRow,
  Divider,
  Skeleton,
} from "@shared/ui";
import { Toggle } from "@shared/ui/Toggle";
import { useLogout, useReference } from "@modules/auth/hooks/useAuth";
import { settingsApi, subscriptionApi } from "../api/settingsApi";

/**
 * Household settings.
 *
 * Ordered by how often a parent actually comes here: the plan and the evening
 * reminder are the two reasons anyone opens settings in a family app; account
 * and data controls sit below, reachable but not competing.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const queryClient = useQueryClient();
  const family = useAuthStore((s) => s.family);
  const user = useAuthStore((s) => s.user);
  const updateFamily = useAuthStore((s) => s.updateFamily);
  const ensureFont = useFontStore((s) => s.ensure);
  const logout = useLogout();
  const { data: reference } = useReference();

  const [error, setError] = useState<string | null>(null);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: subscriptionApi.state,
  });

  const save = useMutation({
    mutationFn: settingsApi.updateFamily,
    onSuccess: (fresh) => {
      updateFamily(fresh);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "That didn't save")),
  });

  if (!family) {
    return (
      <Screen title="Settings">
        <Skeleton height={200} />
      </Screen>
    );
  }

  const notifications = family.notifications;
  const window = family.studyWindow;

  const hourOptions = Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: formatHour(h),
  }));

  const languageOptions = (reference?.languages ?? []).map((l) => ({
    value: l.code,
    label: l.code === "en" ? "English" : `${l.endonym} · ${l.name}`,
  }));

  const status = subscription?.current.status ?? family.subscription.status;
  const cancelled = Boolean(subscription?.current.cancelledAt);

  return (
    <Screen title="Settings" subtitle={family.name}>
      <VStack gap={16}>
        {error ? (
          <Banner tone="danger" title="Couldn't save" body={error} onDismiss={() => setError(null)} />
        ) : null}

        {/* ---- Plan ---------------------------------------------------- */}
        <Card>
          <VStack gap={14}>
            <HStack gap={10}>
              <CreditCard size={17} color={theme.text.accent} />
              <Text variant="h3" style={{ flex: 1 }}>
                Your plan
              </Text>
              <Chip
                label={family.subscription.planName}
                tone={status === "active" ? "moss" : "neutral"}
              />
            </HStack>

            <VStack gap={4}>
              <Text variant="body-sm" tone="tertiary">
                {planSentence(status, subscription?.current, family)}
              </Text>
              {cancelled ? (
                <Text variant="caption" tone="warning">
                  Cancelled — you keep access until the end of the period you've paid for.
                </Text>
              ) : null}
            </VStack>

            <Button
              label="Plans and billing"
              variant="secondary"
              rightIcon={<ChevronRight size={16} color={theme.text.primary} />}
              onPress={() => navigation.navigate("Plans")}
            />
          </VStack>
        </Card>

        {/* ---- Study time ---------------------------------------------- */}
        <Card>
          <VStack gap={14}>
            <HStack gap={10}>
              <Clock size={17} color={theme.text.accent} />
              <Text variant="h3">When you study</Text>
            </HStack>
            <Text variant="caption" tone="tertiary">
              Reminders only ever arrive inside this window.
            </Text>

            <HStack gap={12}>
              <View style={{ flex: 1 }}>
                <Select
                  label="From"
                  value={String(window.startHour)}
                  options={hourOptions}
                  onChange={(v) =>
                    save.mutate({
                      studyWindow: { startHour: Number(v), endHour: window.endHour },
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="Until"
                  value={String(window.endHour)}
                  options={hourOptions}
                  onChange={(v) =>
                    save.mutate({
                      studyWindow: { startHour: window.startHour, endHour: Number(v) },
                    })
                  }
                />
              </View>
            </HStack>
          </VStack>
        </Card>

        {/* ---- Notifications ------------------------------------------- */}
        <Card>
          <VStack gap={4}>
            <HStack gap={10} style={{ marginBottom: 8 }}>
              <Bell size={17} color={theme.text.accent} />
              <Text variant="h3">Reminders</Text>
            </HStack>

            <Toggle
              label="Evening study nudge"
              hint="Only if that child hasn't already studied that day."
              value={notifications.studyReminder}
              onChange={(v) => save.mutate({ notifications: { studyReminder: v } })}
            />
            <Divider />
            {notifications.studyReminder ? (
              <>
                <View style={{ paddingVertical: 10 }}>
                  <Select
                    label="Remind me at"
                    value={String(notifications.reminderHour)}
                    options={hourOptions.filter(
                      (h) => Number(h.value) >= window.startHour && Number(h.value) < window.endHour,
                    )}
                    onChange={(v) =>
                      save.mutate({ notifications: { reminderHour: Number(v) } })
                    }
                    hint="Kept inside your study window."
                  />
                </View>
                <Divider />
              </>
            ) : null}

            <Toggle
              label="Weekly summary"
              hint="A Sunday email with the week's progress."
              value={notifications.weeklySummary}
              onChange={(v) => save.mutate({ notifications: { weeklySummary: v } })}
            />
            <Divider />
            <Toggle
              label="Milestone alerts"
              hint="Streaks, personal bests, topics mastered."
              value={notifications.milestoneAlerts}
              onChange={(v) => save.mutate({ notifications: { milestoneAlerts: v } })}
            />
            <Divider />
            {/**
             * Marketing email is OFF by default and stays a separate toggle
             * from the ones that are part of the service. Bundling them would
             * make turning off promotions cost a parent their weekly summary.
             */}
            <Toggle
              label="News about ParentAI"
              hint="Occasional product updates. Off by default."
              value={notifications.productEmails}
              onChange={(v) => save.mutate({ notifications: { productEmails: v } })}
            />
          </VStack>
        </Card>

        {/* ---- Language ------------------------------------------------ */}
        <Card>
          <VStack gap={14}>
            <HStack gap={10}>
              <Languages size={17} color={theme.text.accent} />
              <Text variant="h3">Household language</Text>
            </HStack>
            <Select
              label="You teach in"
              value={family.homeLanguage}
              options={languageOptions}
              onChange={(v) => {
                void ensureFont(v as LanguageCode);
                save.mutate({ homeLanguage: v });
              }}
              hint="The default for new children. Each child can differ."
            />
          </VStack>
        </Card>

        {/* ---- Account and data ---------------------------------------- */}
        <Card padding="compact">
          <VStack gap={0}>
            <ListRow
              title="Account"
              subtitle={user?.email}
              left={<Smartphone size={17} color={theme.text.tertiary} />}
              onPress={() => navigation.navigate("Account")}
              showChevron
            />
            <Divider />
            <ListRow
              title="Your data and privacy"
              subtitle="Export everything, or delete it"
              left={<ShieldCheck size={17} color={theme.text.tertiary} />}
              onPress={() => navigation.navigate("Privacy")}
              showChevron
            />
          </VStack>
        </Card>

        <Button
          label="Sign out"
          variant="secondary"
          icon={<LogOut size={16} color={theme.text.primary} />}
          onPress={() => logout.mutate()}
          loading={logout.isPending}
        />

        <Text variant="caption" tone="disabled" align="center">
          ParentAI 1.0.0
        </Text>
      </VStack>
    </Screen>
  );
}

function formatHour(h: number) {
  if (h === 0) return "12 midnight";
  if (h === 12) return "12 noon";
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

function planSentence(
  status: string,
  current: { currentPeriodEnd: string | null; trialEndsAt: string | null } | undefined,
  family: { subscription: { trialEndsAt: string | null; currentPeriodEnd: string | null } },
) {
  const trialEnds = current?.trialEndsAt ?? family.subscription.trialEndsAt;
  const periodEnds = current?.currentPeriodEnd ?? family.subscription.currentPeriodEnd;

  if (status === "trialing" && trialEnds) {
    const days = Math.max(0, Math.ceil((new Date(trialEnds).getTime() - Date.now()) / 864e5));
    return days > 0
      ? `Free trial — ${days} day${days === 1 ? "" : "s"} left.`
      : "Your free trial has ended.";
  }
  if (status === "active" && periodEnds) {
    return `Renews on ${new Date(periodEnds).toLocaleDateString()}.`;
  }
  if (status === "past_due") {
    return "We couldn't take the last payment. We'll try again — nothing is switched off yet.";
  }
  if (status === "expired") return "Your subscription has ended.";
  return "";
}

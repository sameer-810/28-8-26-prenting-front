import React, { useState } from "react";
import { View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import {
  Screen,
  Text,
  Button,
  Card,
  TextField,
  Select,
  VStack,
  HStack,
  StatTile,
  Banner,
  ErrorState,
  Skeleton,
  Divider,
} from "@shared/ui";
import { useAdminStore } from "@shared/store/useAdminStore";
import type { AdminStackParamList } from "@navigation/types";
import { useAdminFamily, useSetPlan, useSetActive } from "../hooks/useAdmin";
import { planChangeSchema, activeChangeSchema, type PlanChangeInput } from "../admin.validation";
import { count, shortDate, dateTime, degradedRate, statusLabel } from "../format";
import type { PlanCode } from "../types";

const PLANS: { value: PlanCode; label: string }[] = [
  { value: "trial", label: "Free Trial" },
  { value: "basic_monthly", label: "Basic Monthly — 1 child" },
  { value: "family_annual", label: "Family Annual — 2 children" },
  { value: "family_plus", label: "Family Plus — 6 children" },
];

/**
 * One household, in the detail staff actually need.
 *
 * WHAT IS NOT HERE IS THE POINT.
 *
 * No session content, no generated teaching script, no child's answers. The API
 * does not return them, so this screen could not show them if it tried — and
 * that is deliberate on both ends. Support staff need to see that a family is
 * healthy: what they pay, whether they are studying, whether generation is
 * quietly degrading. Being able to help a parent is not a licence to read a
 * named nine-year-old's schoolwork.
 */
export default function AdminFamilyDetailScreen() {
  const route = useRoute<RouteProp<AdminStackParamList, "AdminFamilyDetail">>();
  const id = route.params.id;

  const isSuperadmin = useAdminStore((s) => s.isSuperadmin());
  const { data, isLoading, error, refetch, isRefetching } = useAdminFamily(id);

  if (isLoading) {
    return (
      <Screen title="Household">
        <VStack gap={12}>
          <Skeleton height={92} />
          <Skeleton height={160} />
        </VStack>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title="Household">
        <ErrorState message={apiErrorMessage(error, "Could not load this household")} onRetry={refetch} />
      </Screen>
    );
  }

  const f = data.family;

  return (
    <Screen
      title={f.name}
      subtitle={`${f.plan?.name || f.subscription.planCode} · ${statusLabel(f.subscription.status)} · joined ${shortDate(f.createdAt)}`}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <VStack gap={16}>
        {!f.isActive ? (
          <Banner
            tone="danger"
            title="This household is disabled"
            body="Nobody in it can sign in. Re-enable it below if that was not intended."
          />
        ) : null}

        {!f.consent.accepted ? (
          <Banner
            tone="danger"
            title="No consent on record"
            body="This household holds a child's data with no recorded lawful basis. Escalate rather than ignore."
          />
        ) : null}

        <Card>
          <HStack gap={16} wrap>
            <StatTile value={count(data.children.length)} label="Children" />
            <StatTile value={count(data.usage.completedSessions)} label="Sessions done" />
            <StatTile value={count(data.usage.plansGenerated)} label="Plans made" />
            <StatTile
              value={degradedRate(data.usage.ai)}
              label="AI degraded"
              hint={data.usage.ai.calls ? `${count(data.usage.ai.calls)} calls` : "no AI calls yet"}
            />
          </HStack>
          <View style={{ marginTop: 12 }}>
            <Text variant="caption" tone="tertiary">
              Last session {dateTime(data.usage.lastSessionAt)}
            </Text>
          </View>
        </Card>

        <Card>
          <VStack gap={10}>
            <Text variant="h3">Parents</Text>
            {data.parents.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Divider /> : null}
                <HStack justify="space-between" align="center" gap={10} style={{ paddingVertical: 6 }}>
                  <VStack gap={2} flex={1}>
                    <Text variant="label">{p.name || "—"}</Text>
                    <Text variant="caption" tone="tertiary">
                      {p.email} · {p.role}
                    </Text>
                  </VStack>
                  <Text variant="caption" tone="tertiary">
                    {dateTime(p.lastLoginAt)}
                  </Text>
                </HStack>
              </View>
            ))}
          </VStack>
        </Card>

        <Card>
          <VStack gap={10}>
            <Text variant="h3">Children</Text>
            {data.children.length === 0 ? (
              <Text variant="body-sm" tone="tertiary">
                No children added yet.
              </Text>
            ) : (
              data.children.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <Divider /> : null}
                  <HStack justify="space-between" align="center" gap={10} style={{ paddingVertical: 6 }}>
                    <VStack gap={2} flex={1}>
                      <Text variant="label">{c.name}</Text>
                      <Text variant="caption" tone="tertiary">
                        Grade {c.grade} · {(c.board || "").toUpperCase()} · {c.fluencyBand || "no rating yet"}
                      </Text>
                    </VStack>
                    <Text variant="caption" tone="tertiary" numeric>
                      {count(c.totalSessions)} sessions · {count(c.streak)}d streak
                    </Text>
                  </HStack>
                </View>
              ))
            )}
            <Text variant="caption" tone="disabled">
              No session content, teaching scripts or answers are available here, to anyone.
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={6}>
            <Text variant="h3">Consent</Text>
            <Text variant="body-sm" tone="tertiary">
              {f.consent.accepted
                ? `Accepted ${shortDate(f.consent.acceptedAt)}, policy version ${f.consent.policyVersion || "—"}.`
                : "Nothing on record."}
            </Text>
          </VStack>
        </Card>

        {isSuperadmin ? (
          <SuperadminActions family={f} onDone={refetch} />
        ) : (
          <Card>
            <VStack gap={6}>
              <Text variant="h3">Changing this household</Text>
              <Text variant="body-sm" tone="tertiary">
                Plan changes and suspension are restricted to superadmins. The server enforces this
                too — the controls are hidden rather than shown and refused.
              </Text>
            </VStack>
          </Card>
        )}
      </VStack>
    </Screen>
  );
}

/**
 * The two write operations, each requiring a recorded reason.
 *
 * The note is mandatory on the server and mandatory here, with the same
 * message. It is written to the activity log against the staff member who made
 * the change: altering what a household is entitled to without recording why is
 * how a billing dispute becomes unanswerable six months later.
 */
function SuperadminActions({
  family,
  onDone,
}: {
  family: { id: string; name: string; isActive: boolean; subscription: { planCode: PlanCode } };
  onDone: () => void;
}) {
  const theme = useTheme();
  const setPlan = useSetPlan(family.id);
  const setActive = useSetActive(family.id);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const planForm = useForm<PlanChangeInput>({
    resolver: zodResolver(planChangeSchema),
    defaultValues: { planCode: family.subscription.planCode, note: "" },
  });

  const activeForm = useForm<{ note: string }>({
    resolver: zodResolver(activeChangeSchema),
    defaultValues: { note: "" },
  });

  return (
    <Card>
      <VStack gap={16}>
        <Text variant="h3">Superadmin actions</Text>

        {setPlan.isError ? (
          <Banner tone="danger" title="Plan not changed" body={apiErrorMessage(setPlan.error)} />
        ) : null}
        {setPlan.isSuccess ? <Banner tone="success" title="Plan changed" /> : null}

        <VStack gap={10}>
          <Controller
            control={planForm.control}
            name="planCode"
            render={({ field }) => (
              <Select label="Plan" value={field.value} options={PLANS} onChange={field.onChange} />
            )}
          />
          <Controller
            control={planForm.control}
            name="note"
            render={({ field, fieldState }) => (
              <TextField
                label="Reason (recorded against your account)"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                placeholder="Refund agreed on ticket 412"
              />
            )}
          />
          <Button
            label="Change plan"
            loading={setPlan.isPending}
            onPress={planForm.handleSubmit((v) =>
              setPlan.mutate(v, { onSuccess: () => { planForm.reset({ ...v, note: "" }); onDone(); } }),
            )}
          />
          <Text variant="caption" tone="tertiary">
            A plan too small for the children already in the household is refused by the server, not
            silently applied.
          </Text>
        </VStack>

        <Divider />

        {setActive.isError ? (
          <Banner tone="danger" title="Not changed" body={apiErrorMessage(setActive.error)} />
        ) : null}

        <VStack gap={10}>
          <Controller
            control={activeForm.control}
            name="note"
            render={({ field, fieldState }) => (
              <TextField
                label="Reason (recorded against your account)"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
                placeholder="Chargeback raised"
              />
            )}
          />

          {family.isActive && !confirmDisable ? (
            <Button
              label="Disable household"
              variant="destructive"
              onPress={activeForm.handleSubmit(() => setConfirmDisable(true))}
            />
          ) : null}

          {family.isActive && confirmDisable ? (
            <View
              style={{
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: theme.danger.bg,
                borderWidth: 1,
                borderColor: theme.danger.border,
              }}
            >
              <VStack gap={10}>
                <Text variant="body-sm" style={{ color: theme.danger.text }}>
                  Disable {family.name}? Every parent in it is signed out and cannot sign back in.
                  Nothing is deleted.
                </Text>
                <HStack gap={8}>
                  <Button
                    label="Yes, disable"
                    variant="destructive"
                    fullWidth={false}
                    loading={setActive.isPending}
                    onPress={activeForm.handleSubmit((v) =>
                      setActive.mutate(
                        { isActive: false, note: v.note },
                        { onSuccess: () => { setConfirmDisable(false); activeForm.reset(); onDone(); } },
                      ),
                    )}
                  />
                  <Button
                    label="Keep it active"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => setConfirmDisable(false)}
                  />
                </HStack>
              </VStack>
            </View>
          ) : null}

          {!family.isActive ? (
            <Button
              label="Re-enable household"
              loading={setActive.isPending}
              onPress={activeForm.handleSubmit((v) =>
                setActive.mutate(
                  { isActive: true, note: v.note },
                  { onSuccess: () => { activeForm.reset(); onDone(); } },
                ),
              )}
            />
          ) : null}
        </VStack>

        <Text variant="caption" tone="disabled">
          Neither action deletes anything. Erasure is the household's own right, exercised from
          their privacy screen.
        </Text>
      </VStack>
    </Card>
  );
}

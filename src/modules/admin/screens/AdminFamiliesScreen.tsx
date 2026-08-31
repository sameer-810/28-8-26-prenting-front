import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
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
  EmptyState,
  ErrorState,
  Skeleton,
} from "@shared/ui";
import { useAppNavigation } from "@navigation/types";
import { useAdminFamilies } from "../hooks/useAdmin";
import { count, shortDate, statusLabel, statusTone } from "../format";
import type { PlanCode, SubscriptionStatus } from "../types";

const PLAN_OPTIONS = [
  { value: "", label: "Any plan" },
  { value: "trial", label: "Free Trial" },
  { value: "basic_monthly", label: "Basic Monthly" },
  { value: "family_annual", label: "Family Annual" },
  { value: "family_plus", label: "Family Plus" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "trialing", label: "Free trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Payment failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

/**
 * Every household on the platform.
 *
 * Each keystroke would be a paginated query across every family, and the answer
 * to a half-typed name is noise. The search box submits, which is also what
 * makes the result stable enough to read — a support call is somebody reading a
 * name aloud, not exploring.
 */
export default function AdminFamiliesScreen() {
  const theme = useTheme();
  const navigation = useAppNavigation();

  const [draft, setDraft] = useState({ search: "", planCode: "", status: "" });
  const [applied, setApplied] = useState<{
    page: number;
    limit: number;
    search?: string;
    planCode?: PlanCode;
    status?: SubscriptionStatus;
  }>({ page: 1, limit: 25 });

  const { data, isLoading, error, refetch, isRefetching } = useAdminFamilies(applied);

  const apply = () =>
    setApplied({
      page: 1,
      limit: 25,
      search: draft.search.trim() || undefined,
      planCode: (draft.planCode || undefined) as PlanCode | undefined,
      status: (draft.status || undefined) as SubscriptionStatus | undefined,
    });

  const rows = data?.data || [];
  const meta = data?.meta;

  return (
    <Screen
      title="Households"
      subtitle="Open one to see its health and change its plan."
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <VStack gap={16}>
        <Card>
          <VStack gap={12}>
            <TextField
              label="Search by household name"
              value={draft.search}
              onChangeText={(search) => setDraft((d) => ({ ...d, search }))}
              placeholder="Sharma"
              onSubmitEditing={apply}
              returnKeyType="search"
            />
            <HStack gap={10} wrap>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Select
                  label="Plan"
                  value={draft.planCode}
                  options={PLAN_OPTIONS}
                  onChange={(planCode) => setDraft((d) => ({ ...d, planCode }))}
                />
              </View>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Select
                  label="Status"
                  value={draft.status}
                  options={STATUS_OPTIONS}
                  onChange={(status) => setDraft((d) => ({ ...d, status }))}
                />
              </View>
            </HStack>
            <Button label="Apply filters" onPress={apply} variant="secondary" />
          </VStack>
        </Card>

        {isLoading ? (
          <VStack gap={8}>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </VStack>
        ) : error ? (
          <ErrorState message={apiErrorMessage(error, "Could not load households")} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No households match that"
            body="Try a shorter name, or clear the plan and status filters."
          />
        ) : (
          <VStack gap={8}>
            {rows.map((f) => {
              const tone = statusTone(f.status);
              const colors = {
                success: theme.success,
                info: theme.info,
                warning: theme.warning,
                danger: theme.danger,
                neutral: { bg: theme.surface.sunken, text: theme.text.tertiary },
              }[tone];

              return (
                <Pressable
                  key={f.id}
                  onPress={() => navigation.navigate("AdminFamilyDetail", { id: f.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${f.planName}, ${statusLabel(f.status)}`}
                >
                  <Card>
                    <HStack justify="space-between" align="center" gap={12}>
                      <VStack gap={3} flex={1}>
                        <HStack gap={8} align="center" wrap>
                          <Text variant="label">{f.name}</Text>
                          {!f.isActive ? (
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: radius.full,
                                backgroundColor: theme.danger.bg,
                              }}
                            >
                              <Text variant="caption" style={{ color: theme.danger.text }}>
                                disabled
                              </Text>
                            </View>
                          ) : null}
                        </HStack>
                        <Text variant="caption" tone="tertiary">
                          {f.planName} · joined {shortDate(f.createdAt)}
                          {f.currentPeriodEnd ? ` · renews ${shortDate(f.currentPeriodEnd)}` : ""}
                        </Text>
                      </VStack>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: radius.full,
                          backgroundColor: colors.bg,
                        }}
                      >
                        <Text variant="label-sm" style={{ color: colors.text }}>
                          {statusLabel(f.status)}
                        </Text>
                      </View>

                      <ChevronRight size={18} color={theme.text.tertiary} />
                    </HStack>
                  </Card>
                </Pressable>
              );
            })}

            {meta && meta.pages > 1 ? (
              <HStack justify="space-between" align="center" gap={12}>
                <Text variant="caption" tone="tertiary">
                  {count(meta.total)} households · page {meta.page} of {meta.pages}
                </Text>
                <HStack gap={8}>
                  <Button
                    label="Previous"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    disabled={applied.page <= 1}
                    onPress={() => setApplied((a) => ({ ...a, page: a.page - 1 }))}
                  />
                  <Button
                    label="Next"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    disabled={applied.page >= meta.pages}
                    onPress={() => setApplied((a) => ({ ...a, page: a.page + 1 }))}
                  />
                </HStack>
              </HStack>
            ) : null}
          </VStack>
        )}
      </VStack>
    </Screen>
  );
}

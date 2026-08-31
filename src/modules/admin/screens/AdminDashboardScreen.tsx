import React from "react";
import { View } from "react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Screen, Text, Card, VStack, HStack, StatTile, ErrorState, Skeleton } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useAdminOverview } from "../hooks/useAdmin";
import { rupees, count, pct } from "../format";

/**
 * The platform at a glance.
 *
 * Everything else here is growth — households, children, sessions. The AI
 * degradation rate is the one that says families are quietly receiving TEMPLATE
 * plans instead of generated ones. That failure is invisible from the outside
 * by design: the product never shows a parent an error, it hands them something
 * usable and carries on. Which means the only place it can be seen at all is
 * here, so it is coloured and it is explained in words rather than left as a
 * percentage somebody has to already understand.
 */
export default function AdminDashboardScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch, isRefetching } = useAdminOverview();

  if (isLoading) {
    return (
      <Screen title="Overview">
        <VStack gap={12}>
          <Skeleton height={92} />
          <Skeleton height={180} />
          <Skeleton height={180} />
        </VStack>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title="Overview">
        <ErrorState message={apiErrorMessage(error, "Could not load the overview")} onRetry={refetch} />
      </Screen>
    );
  }

  const plans = Object.entries(data.families.byPlan || {});

  return (
    <Screen
      title="Overview"
      subtitle="Households, activity and AI health across the platform."
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <VStack gap={16}>
        <Card>
          <HStack gap={16} wrap>
            <StatTile value={count(data.families.total)} label="Households" hint={`${count(data.families.active)} active`} />
            <StatTile value={count(data.children)} label="Children" />
            <StatTile value={count(data.parents)} label="Parents" />
            <StatTile
              value={count(data.sessions.today)}
              label="Sessions today"
              hint={`${count(data.sessions.last7Days)} in 7 days`}
            />
            <StatTile
              value={rupees(data.entitledMrrInPaise)}
              label="Entitled MRR"
              /**
               * Labelled, because it is not revenue. It is what these
               * households are currently entitled to per month, computed from
               * plan state rather than from payments received — and a founder
               * reading it as cash collected would be reading it wrong.
               */
              hint="what plans are worth, not cash received"
            />
          </HStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <Text variant="h3">AI health, last 7 days</Text>

            {data.ai.length === 0 ? (
              <Text variant="body-sm" tone="tertiary">
                No AI calls in the last 7 days.
              </Text>
            ) : (
              <VStack gap={8}>
                {data.ai.map((op) => {
                  const tone =
                    op.degradedPct > 0.05 ? "danger" : op.degradedPct > 0 ? "warning" : "success";
                  const colors = {
                    danger: theme.danger,
                    warning: theme.warning,
                    success: theme.success,
                  }[tone];

                  return (
                    <View
                      key={op.operation}
                      style={{
                        padding: 12,
                        borderRadius: radius.md,
                        backgroundColor: theme.surface.sunken,
                      }}
                    >
                      <HStack justify="space-between" align="center" wrap gap={8}>
                        <VStack gap={2} flex={1}>
                          <Text variant="label">{op.operation.replace("_", " ")}</Text>
                          <Text variant="caption" tone="tertiary">
                            {count(op.calls)} calls · {count(op.outputTokens)} output tokens ·{" "}
                            {count(op.avgLatencyMs)}ms average
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
                            {pct(op.degradedPct)} degraded
                          </Text>
                        </View>
                      </HStack>
                    </View>
                  );
                })}
              </VStack>
            )}

            <Text variant="caption" tone="tertiary">
              Degraded means a household received a template plan instead of a generated one. The
              product is designed never to show them an error, so this is the only place it is
              visible.
            </Text>
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <Text variant="h3">Households by plan</Text>
            {plans.length === 0 ? (
              <Text variant="body-sm" tone="tertiary">
                No households yet.
              </Text>
            ) : (
              <VStack gap={6}>
                {plans.map(([code, n]) => (
                  <HStack key={code} justify="space-between">
                    <Text variant="body-sm">{code.replace("_", " ")}</Text>
                    <Text variant="body-sm" numeric tone="tertiary">
                      {count(n)}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </VStack>
        </Card>
      </VStack>
    </Screen>
  );
}

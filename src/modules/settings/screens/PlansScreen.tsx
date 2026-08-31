import React, { useState } from "react";
import { View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, AlertTriangle } from "lucide-react-native";
import { apiErrorCode, apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { shortDate, rupees } from "@shared/format";
import { useAuthStore } from "@shared/store/useAuthStore";
import {
  Screen,
  Text,
  Button,
  Card,
  Chip,
  VStack,
  HStack,
  Banner,
  Skeleton,
} from "@shared/ui";
import { subscriptionApi, openRazorpayCheckout } from "../api/settingsApi";
import { useSubscription, useSubscriptionHistory, settingsKeys } from "../hooks/useSettings";

/**
 * Plans and billing.
 *
 * The prices come from the API rather than the bundle, so a price change never
 * leaves an old build quoting the wrong number at the moment of payment.
 */
export default function PlansScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { tone: "success" | "danger" | "info"; title: string; body: string } | null
  >(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data, isLoading, refetch } = useSubscription();
  const { data: history } = useSubscriptionHistory();

  const cancel = useMutation({
    mutationFn: () => subscriptionApi.cancel(false),
    onSuccess: () => {
      setConfirmCancel(false);
      setMessage({
        tone: "info",
        title: "Cancelled",
        body: "You keep everything until the end of the period you've already paid for.",
      });
      queryClient.invalidateQueries({ queryKey: settingsKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.me() });
    },
    onError: (err) =>
      setMessage({ tone: "danger", title: "Couldn't cancel", body: apiErrorMessage(err) }),
  });

  const subscribe = async (planCode: string) => {
    setBusy(planCode);
    setMessage(null);
    try {
      const checkout = await subscriptionApi.createCheckout(planCode);
      const result = await openRazorpayCheckout({
        subscriptionId: checkout.subscriptionId,
        razorpayKeyId: checkout.razorpayKeyId,
        planName: checkout.planName,
        parentName: user?.fullName || user?.firstName || "",
        parentEmail: user?.email || "",
      });

      if (!result.ok) {
        // A parent who closed the modal has not failed at anything.
        if (!result.dismissed) {
          setMessage({ tone: "danger", title: "Checkout didn't open", body: result.reason });
        }
        return;
      }

      await subscriptionApi.confirmCheckout({
        subscriptionId: checkout.subscriptionId,
        paymentId: result.paymentId,
        signature: result.signature,
      });
      setMessage({ tone: "success", title: "You're all set", body: "Your plan is active." });
      queryClient.invalidateQueries({ queryKey: settingsKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.me() });
      refetch();
    } catch (err) {
      /**
       * The most likely failure by far is that the server has no Razorpay keys
       * yet, which comes back as 503. Saying "payments aren't set up" is the
       * truth; "something went wrong" would send a parent hunting for a fault
       * at their end.
       */
      const code = apiErrorCode(err);
      setMessage({
        tone: "danger",
        title:
          code === "SERVICE_UNAVAILABLE" ? "Payments aren't switched on yet" : "Couldn't start checkout",
        body: apiErrorMessage(err),
      });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen title="Plans">
        <VStack gap={14}>
          <Skeleton height={180} />
          <Skeleton height={180} />
        </VStack>
      </Screen>
    );
  }

  return (
    <Screen title="Plans and billing" subtitle={`You have ${data.childCount} child${data.childCount === 1 ? "" : "ren"}`}>
      <VStack gap={16} style={{ maxWidth: 620 }}>
        {message ? (
          <Banner
            tone={message.tone === "info" ? "info" : message.tone}
            title={message.title}
            body={message.body}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        {/**
         * Stated up front rather than discovered at the moment of payment. A
         * parent who taps Subscribe and hits a 503 concludes the app is broken;
         * one who was told beforehand knows it is simply not live yet.
         */}
        {!data.paymentsConfigured ? (
          <Banner
            tone="warning"
            title="Payments aren't live yet"
            body="Plans are shown here, but checkout isn't switched on. Your trial and everything in the app keep working."
          />
        ) : null}

        {data.plans.map((plan) => {
          const highlighted = Boolean(plan.badge);
          return (
            <Card
              key={plan.code}
              tone={plan.isCurrent ? "success" : "default"}
              style={
                highlighted && !plan.isCurrent
                  ? { borderColor: theme.brand[400], borderWidth: 2 }
                  : undefined
              }
            >
              <VStack gap={14}>
                <HStack justify="space-between">
                  <VStack gap={2} flex={1}>
                    <HStack gap={8}>
                      <Text variant="h2">{plan.name}</Text>
                      {plan.badge ? <Chip label={plan.badge} tone="moss" /> : null}
                      {plan.isCurrent ? <Chip label="Current" tone="success" /> : null}
                    </HStack>
                    <HStack gap={6} align="baseline">
                      <Text variant="display-sm" numeric>
                        {plan.priceLabel}
                      </Text>
                      <Text variant="body-sm" tone="tertiary">
                        {plan.intervalLabel}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>

                <VStack gap={7}>
                  {plan.features.map((f) => (
                    <HStack key={f} gap={8} align="flex-start">
                      <Check size={15} color={theme.text.accent} style={{ marginTop: 2 }} />
                      <Text variant="body-sm" tone="secondary" style={{ flex: 1 }}>
                        {f}
                      </Text>
                    </HStack>
                  ))}
                </VStack>

                {/**
                 * A plan that cannot hold this family's children is disabled
                 * with the reason, not hidden. Hiding it would leave a parent
                 * wondering where the cheaper option went.
                 */}
                {!plan.supportsCurrentChildren && !plan.isCurrent ? (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      padding: 10,
                      borderRadius: radius.sm,
                      backgroundColor: theme.warning.bg,
                    }}
                  >
                    <AlertTriangle size={14} color={theme.warning.text} style={{ marginTop: 1 }} />
                    <Text variant="caption" style={{ color: theme.warning.text, flex: 1 }}>
                      Covers {plan.maxChildren} child{plan.maxChildren === 1 ? "" : "ren"} — you
                      have {data.childCount}.
                    </Text>
                  </View>
                ) : null}

                {plan.isCurrent ? (
                  <Button label="Your current plan" variant="secondary" disabled />
                ) : (
                  <Button
                    label={`Choose ${plan.name}`}
                    icon={<Sparkles size={15} color="#FFFFFF" />}
                    onPress={() => subscribe(plan.code)}
                    loading={busy === plan.code}
                    disabled={!plan.supportsCurrentChildren || !data.paymentsConfigured}
                  />
                )}
              </VStack>
            </Card>
          );
        })}

        {data.current.status === "active" && !data.current.cancelledAt ? (
          <Card tone="sunken">
            <VStack gap={12}>
              <Text variant="label">Cancel your subscription</Text>
              <Text variant="body-sm" tone="tertiary">
                You'll keep everything until{" "}
                {data.current.currentPeriodEnd
                  ? shortDate(data.current.currentPeriodEnd)
                  : "the end of your period"}
                . Nothing is deleted.
              </Text>
              {confirmCancel ? (
                <HStack gap={8}>
                  <View style={{ flex: 1 }}>
                    <Button label="Keep my plan" onPress={() => setConfirmCancel(false)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Yes, cancel"
                      variant="destructive"
                      onPress={() => cancel.mutate()}
                      loading={cancel.isPending}
                    />
                  </View>
                </HStack>
              ) : (
                <Button
                  label="Cancel subscription"
                  variant="ghost"
                  onPress={() => setConfirmCancel(true)}
                />
              )}
            </VStack>
          </Card>
        ) : null}

        {history?.length ? (
          <Card>
            <VStack gap={12}>
              <Text variant="h3">Billing history</Text>
              {history.slice(0, 8).map((e) => (
                <HStack key={e.id} justify="space-between" gap={10}>
                  <VStack gap={1} flex={1}>
                    <Text variant="body-sm">{prettyEvent(e.event)}</Text>
                    <Text variant="caption" tone="tertiary">
                      {shortDate(e.createdAt)}
                    </Text>
                  </VStack>
                  {e.amountInPaise > 0 ? (
                    <Text variant="label-sm" numeric tone="tertiary">
                      {rupees(e.amountInPaise)}
                    </Text>
                  ) : null}
                </HStack>
              ))}
            </VStack>
          </Card>
        ) : null}
      </VStack>
    </Screen>
  );
}

function prettyEvent(event: string) {
  const map: Record<string, string> = {
    "checkout.created": "Checkout started",
    "subscription.activated": "Subscription activated",
    "subscription.charged": "Payment received",
    "subscription.cancelled": "Cancelled",
    "plan.changed_by_admin": "Plan changed by support",
    "family.suspended": "Household suspended",
    "family.reactivated": "Household reactivated",
  };
  return map[event] || event.replace(/[._]/g, " ");
}

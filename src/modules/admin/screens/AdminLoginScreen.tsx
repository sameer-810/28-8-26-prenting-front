import React from "react";
import { View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledTextField } from "@shared/form";
import { ShieldCheck } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Screen, Text, Button, Card, VStack, HStack, Banner } from "@shared/ui";
import { useAdminLogin } from "../hooks/useAdmin";
import { adminLoginSchema, type AdminLoginInput } from "../admin.validation";

/**
 * The staff sign-in. No brand panel, no signup, no password reset — staff
 * accounts have no self-service recovery, and a "forgot password?" link that
 * leads nowhere is worse than none.
 *
 * A parent who lands on /admin sees this and nothing else; their own session is
 * untouched either way.
 */
export default function AdminLoginScreen() {
  const theme = useTheme();
  const login = useAdminLogin();

  const { control, handleSubmit, formState } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <Screen>
      <View style={{ width: "100%", maxWidth: 400, alignSelf: "center", paddingTop: 40 }}>
        <Card>
          <VStack gap={20}>
            <VStack gap={6}>
              <HStack gap={8} align="center">
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: radius.sm,
                    backgroundColor: theme.accents.moss.tint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck size={17} color={theme.text.accent} />
                </View>
                <Text variant="h2">Platform console</Text>
              </HStack>
              <Text variant="body-sm" tone="tertiary">
                ParentAI staff only. This is not the parent sign-in.
              </Text>
            </VStack>

            {login.isError ? (
              <Banner
                tone="danger"
                title="Could not sign in"
                body={apiErrorMessage(login.error)}
              />
            ) : null}

            <ControlledTextField
              control={control}
              name="email"
              label="Work email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              placeholder="you@parentai.app"
            />

            <ControlledTextField
              control={control}
              name="password"
              label="Password"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={handleSubmit((v) => login.mutate(v))}
            />

            <Button
              label="Sign in"
              loading={login.isPending}
              disabled={formState.isSubmitting}
              onPress={handleSubmit((v) => login.mutate(v))}
            />

            <Text variant="caption" tone="disabled">
              Staff accounts have no password reset. If you are locked out, an operator runs{" "}
              npm run seed:admin -- --email you@… --reset-password against production.
            </Text>
          </VStack>
        </Card>
      </View>
    </Screen>
  );
}

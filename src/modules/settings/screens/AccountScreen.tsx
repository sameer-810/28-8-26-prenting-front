import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Monitor, Smartphone, KeyRound } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import {
  Screen,
  Text,
  Button,
  Card,
  TextField,
  VStack,
  HStack,
  Banner,
  ListRow,
  Divider,
} from "@shared/ui";
import { settingsApi } from "../api/settingsApi";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "At least 10 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password you haven't used here before",
    path: ["newPassword"],
  });

type PasswordInput = z.infer<typeof passwordSchema>;

export default function AccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState<
    { tone: "success" | "danger"; title: string; body: string } | null
  >(null);

  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: settingsApi.devices,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const changePassword = useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      reset();
      /**
       * The server revokes every other session on a password change — which is
       * the point of changing it — so the parent is told, rather than being
       * surprised when their other device asks them to sign in again.
       */
      setMessage({
        tone: "success",
        title: "Password changed",
        body: "Your other devices have been signed out.",
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err) =>
      setMessage({
        tone: "danger",
        title: "Couldn't change your password",
        body: apiErrorMessage(err),
      }),
  });

  const revoke = useMutation({
    mutationFn: settingsApi.revokeDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  return (
    <Screen title="Account" subtitle={user?.email}>
      <VStack gap={16} style={{ maxWidth: 560 }}>
        {message ? (
          <Banner
            tone={message.tone}
            title={message.title}
            body={message.body}
            onDismiss={() => setMessage(null)}
          />
        ) : null}

        <Card>
          <VStack gap={14}>
            <HStack gap={10}>
              <KeyRound size={17} color={theme.text.accent} />
              <Text variant="h3">Change your password</Text>
            </HStack>

            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, value } }) => (
                <TextField
                  label="Current password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.currentPassword?.message}
                  secureTextEntry
                  autoComplete="current-password"
                />
              )}
            />
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <TextField
                  label="New password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.newPassword?.message}
                  hint="At least 10 characters. A short phrase works well."
                  secureTextEntry
                  autoComplete="new-password"
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <TextField
                  label="Confirm new password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  secureTextEntry
                  autoComplete="new-password"
                />
              )}
            />

            <Button
              label="Change password"
              onPress={handleSubmit((v) =>
                changePassword.mutate({
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                }),
              )}
              loading={changePassword.isPending}
            />
          </VStack>
        </Card>

        <Card padding="compact">
          <VStack gap={0}>
            <HStack gap={10} style={{ paddingVertical: 10 }}>
              <Monitor size={17} color={theme.text.accent} />
              <VStack gap={2} flex={1}>
                <Text variant="h3">Where you're signed in</Text>
                <Text variant="caption" tone="tertiary">
                  Sign out anything you don't recognise.
                </Text>
              </VStack>
            </HStack>
            <Divider />

            {devices?.length ? (
              devices.map((d, i) => (
                <React.Fragment key={d.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={d.deviceName || "Unknown device"}
                    subtitle={`${d.platform || "unknown"} · last used ${new Date(d.lastUsedAt).toLocaleDateString()}`}
                    left={
                      d.platform === "web" ? (
                        <Monitor size={16} color={theme.text.tertiary} />
                      ) : (
                        <Smartphone size={16} color={theme.text.tertiary} />
                      )
                    }
                    right={
                      <Button
                        label="Sign out"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        onPress={() => revoke.mutate(d.id)}
                      />
                    }
                  />
                </React.Fragment>
              ))
            ) : (
              <Text variant="body-sm" tone="tertiary" style={{ paddingVertical: 12 }}>
                No other devices.
              </Text>
            )}
          </VStack>
        </Card>

        <Text variant="caption" tone="disabled">
          Signing a device out here frees a slot against your plan's device
          limit straight away.
        </Text>
      </VStack>
    </Screen>
  );
}

import React from "react";
import { View } from "react-native";
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
  Banner,
  ErrorState,
  Skeleton,
  Divider,
} from "@shared/ui";
import { useAdminStore } from "@shared/store/useAdminStore";
import { useAdminList, useCreateAdmin } from "../hooks/useAdmin";
import { createAdminSchema, type CreateAdminInput } from "../admin.validation";
import { dateTime } from "../format";

/**
 * Who can open this console, and what they can do with it.
 *
 * Visible to every staff member, not just superadmins. Knowing who else has
 * access is part of access control working — a support account that cannot see
 * the list has no way to notice an unfamiliar name on it.
 */
export default function AdminStaffScreen() {
  const isSuperadmin = useAdminStore((s) => s.isSuperadmin());
  const { data, isLoading, error, refetch, isRefetching } = useAdminList();

  return (
    <Screen
      title="Staff"
      subtitle="Who can open this console, and what they can change."
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <VStack gap={16}>
        {isLoading ? (
          <Skeleton height={140} />
        ) : error ? (
          <ErrorState message={apiErrorMessage(error, "Could not load staff")} onRetry={refetch} />
        ) : (
          <Card>
            <VStack gap={8}>
              {(data || []).map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Divider /> : null}
                  <HStack justify="space-between" align="center" gap={10} style={{ paddingVertical: 6 }}>
                    <VStack gap={2} flex={1}>
                      <HStack gap={8} align="center" wrap>
                        <Text variant="label">{a.name}</Text>
                        <RolePill role={a.role} />
                        {!a.isActive ? <RolePill role="disabled" /> : null}
                      </HStack>
                      <Text variant="caption" tone="tertiary">
                        {a.email}
                      </Text>
                    </VStack>
                    <Text variant="caption" tone="tertiary">
                      {dateTime(a.lastLoginAt)}
                    </Text>
                  </HStack>
                </View>
              ))}
            </VStack>
          </Card>
        )}

        {isSuperadmin ? <CreateAdminCard onCreated={refetch} /> : null}
      </VStack>
    </Screen>
  );
}

function RolePill({ role }: { role: "superadmin" | "support" | "disabled" }) {
  const theme = useTheme();
  const colors =
    role === "superadmin"
      ? theme.info
      : role === "disabled"
        ? theme.danger
        : { bg: theme.surface.sunken, text: theme.text.tertiary };

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
        backgroundColor: colors.bg,
      }}
    >
      <Text variant="caption" style={{ color: colors.text }}>
        {role}
      </Text>
    </View>
  );
}

function CreateAdminCard({ onCreated }: { onCreated: () => void }) {
  const create = useCreateAdmin();
  const { control, handleSubmit, reset } = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    /**
     * Defaults to `support`, and that is a real decision rather than
     * alphabetical luck. Superadmin can change what any household pays and can
     * disable any of them, with no approval step behind it — so it is the role
     * somebody has to deliberately choose, never the one they get by leaving a
     * dropdown alone.
     */
    defaultValues: { name: "", email: "", password: "", role: "support" },
  });

  return (
    <Card>
      <VStack gap={12}>
        <Text variant="h3">Add a staff account</Text>

        {create.isError ? (
          <Banner tone="danger" title="Not created" body={apiErrorMessage(create.error)} />
        ) : null}
        {create.isSuccess ? (
          <Banner tone="success" title="Account created" body="They can sign in now." />
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="Name"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Work email"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              secureTextEntry
              autoComplete="new-password"
              hint="At least 10 characters. Send it to them out of band and have them change it."
            />
          )}
        />
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              label="Role"
              value={field.value}
              options={[
                { value: "support", label: "Support", hint: "Read only — cannot change plans" },
                { value: "superadmin", label: "Superadmin", hint: "Can change plans and disable households" },
              ]}
              onChange={field.onChange}
            />
          )}
        />

        <Button
          label="Create account"
          loading={create.isPending}
          onPress={handleSubmit((v) =>
            create.mutate(v, {
              onSuccess: () => {
                reset();
                onCreated();
              },
            }),
          )}
        />

        <Text variant="caption" tone="disabled">
          There is no self-service password reset for staff. A locked-out account is recovered by an
          operator running the seed script against production.
        </Text>
      </VStack>
    </Card>
  );
}

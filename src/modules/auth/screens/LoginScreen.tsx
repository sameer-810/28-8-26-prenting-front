import React, { useState } from "react";
import { Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiErrorMessage, apiErrorCode } from "@api/apiClient";
import { Text, Button, TextField, VStack, HStack, Banner } from "@shared/ui";
import { useAppNavigation } from "@navigation/types";
import { AuthLayout } from "../components/AuthLayout";
import { useLogin } from "../hooks/useAuth";
import { loginSchema, type LoginInput } from "../auth.validation";

export default function LoginScreen() {
  const navigation = useAppNavigation();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    setFormError(null);
    login.mutate(values, {
      onError: (err) => setFormError(apiErrorMessage(err, "We couldn't sign you in")),
    });
  };

  /**
   * A lockout is not a wrong password, and saying so matters: a parent who has
   * mistyped four times needs to know that waiting fixes it, not that their
   * account is gone.
   */
  const lockedOut = login.error ? apiErrorCode(login.error) === "TOO_MANY_REQUESTS" : false;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <HStack gap={6} justify="center">
          <Text variant="body-sm" tone="tertiary">
            New to ParentAI?
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Signup")}
            accessibilityRole="link"
          >
            <Text variant="label" tone="link">
              Create an account
            </Text>
          </Pressable>
        </HStack>
      }
    >
      <VStack gap={16}>
        {formError ? (
          <Banner
            tone={lockedOut ? "warning" : "danger"}
            title={lockedOut ? "Too many attempts" : "Couldn't sign in"}
            body={formError}
            onDismiss={() => setFormError(null)}
          />
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@example.com"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        <Pressable
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="link"
          style={{ alignSelf: "flex-end" }}
        >
          <Text variant="label" tone="link">
            Forgot password?
          </Text>
        </Pressable>

        <Button label="Sign in" onPress={handleSubmit(onSubmit)} loading={login.isPending} />
      </VStack>
    </AuthLayout>
  );
}

import React, { useState } from "react";
import { Pressable } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { ControlledTextField } from "@shared/form";
import { z } from "zod";
import { apiErrorMessage } from "@api/apiClient";
import { Text, Button, VStack, HStack, Banner } from "@shared/ui";
import { useAppNavigation, type AuthStackParamList } from "@navigation/types";
import { AuthLayout } from "../components/AuthLayout";
import { useResetPassword } from "../hooks/useAuth";
import { resetPasswordSchema } from "../auth.validation";

type Input = z.infer<typeof resetPasswordSchema>;

/**
 * The other half of "forgot password".
 *
 * The reset email sends the parent to /reset-password?token=… . Everything
 * behind that link already existed — the API consumes the token once, expires
 * it after an hour and revokes every session — but this screen did not, so the
 * link fell through to /login and account recovery was impossible to complete.
 *
 * The token arrives in the URL, never typed. It is carried in form state rather
 * than shown, because it is a credential and there is nothing useful a parent
 * can do with it on screen.
 */
export default function ResetPasswordScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const navigation = useAppNavigation();
  const reset = useResetPassword();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = route.params?.token ?? "";

  const { control, handleSubmit } = useForm<Input>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const onSubmit = (values: Input) => {
    setError(null);
    reset.mutate(
      { token: values.token, password: values.password },
      {
        onSuccess: () => setDone(true),
        /**
         * An expired or already-used link is the common case here, not an edge
         * case — parents open the email late, or tap it twice. It needs to read
         * as "ask for a new one", not as a crash.
         */
        onError: (err) =>
          setError(
            apiErrorMessage(err, "That reset link is invalid or has expired."),
          ),
      },
    );
  };

  const backToSignIn = (
    <HStack justify="center">
      <Pressable
        onPress={() => navigation.navigate("Login")}
        accessibilityRole="link"
        style={{ paddingVertical: 12, paddingHorizontal: 8 }}
      >
        <Text variant="label" tone="link">
          Back to sign in
        </Text>
      </Pressable>
    </HStack>
  );

  /**
   * A link with no token at all — someone opened the URL by hand, or the mail
   * client mangled it. Say so rather than presenting a form that cannot work.
   */
  if (!token) {
    return (
      <AuthLayout title="Reset your password" footer={backToSignIn}>
        <VStack gap={16}>
          <Banner
            tone="warning"
            title="This link is incomplete"
            body="Open the link from your reset email, or ask for a new one."
          />
          <Button
            label="Send a new link"
            onPress={() => navigation.navigate("ForgotPassword")}
          />
        </VStack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={done ? undefined : "It needs to be at least 10 characters."}
      footer={backToSignIn}
    >
      <VStack gap={16}>
        {done ? (
          <>
            <Banner
              tone="success"
              title="Password updated"
              body="Every device that was signed in has been signed out. Sign in with your new password."
            />
            <Button
              label="Sign in"
              onPress={() => navigation.navigate("Login")}
            />
          </>
        ) : (
          <>
            {error ? (
              <Banner
                tone="danger"
                title="Couldn't reset your password"
                body={error}
                onDismiss={() => setError(null)}
              />
            ) : null}
            <ControlledTextField
              control={control}
              name="password"
              label="New password"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <ControlledTextField
              control={control}
              name="confirmPassword"
              label="Confirm new password"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
            <Button
              label="Save new password"
              onPress={handleSubmit(onSubmit)}
              loading={reset.isPending}
            />
          </>
        )}
      </VStack>
    </AuthLayout>
  );
}

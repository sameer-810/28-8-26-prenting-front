import React, { useState } from "react";
import { Pressable } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledTextField } from "@shared/form";
import { z } from "zod";
import { Text, Button, VStack, HStack, Banner } from "@shared/ui";
import { useAppNavigation } from "@navigation/types";
import { AuthLayout } from "../components/AuthLayout";
import { useForgotPassword } from "../hooks/useAuth";
import { forgotPasswordSchema } from "../auth.validation";

type Input = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const navigation = useAppNavigation();
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);

  const { control, handleSubmit } = useForm<Input>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  /**
   * The confirmation is the same whether or not the address is registered —
   * matching the server, which deliberately answers identically. Saying "no
   * account with that email" here would be a free membership check against any
   * address, which for this product means "does this person have children using
   * ParentAI".
   */
  const onSubmit = (values: Input) => {
    forgot.mutate(values.email, { onSuccess: () => setSent(true) });
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        sent ? undefined : "We'll email you a link to choose a new one."
      }
      footer={
        <HStack justify="center">
          <Pressable
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="link"
          >
            <Text variant="label" tone="link">
              Back to sign in
            </Text>
          </Pressable>
        </HStack>
      }
    >
      <VStack gap={16}>
        {sent ? (
          <Banner
            tone="success"
            title="Check your email"
            body="If that address is registered, a reset link is on its way. It's valid for an hour."
          />
        ) : (
          <>
            <ControlledTextField
              control={control}
              name="email"
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
            <Button
              label="Send reset link"
              onPress={handleSubmit(onSubmit)}
              loading={forgot.isPending}
            />
          </>
        )}
      </VStack>
    </AuthLayout>
  );
}

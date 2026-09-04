import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledTextField } from "@shared/form";
import { Check } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import { radius } from "@shared/designSystem";
import { Text, Button, VStack, HStack, Banner } from "@shared/ui";
import { useAppNavigation } from "@navigation/types";
import { AuthLayout } from "../components/AuthLayout";
import { useSignup } from "../hooks/useAuth";
import { signupSchema, type SignupInput } from "../auth.validation";

export default function SignupScreen() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const signup = useSignup();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      familyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      consent: false as never,
    },
  });

  const onSubmit = (values: SignupInput) => {
    setFormError(null);
    signup.mutate(
      {
        firstName: values.firstName,
        familyName: values.familyName,
        email: values.email,
        password: values.password,
      },
      {
        onError: (err) =>
          setFormError(apiErrorMessage(err, "We couldn't create your account")),
      },
    );
  };

  return (
    <AuthLayout
      title="Create your account"
      /**
       * The subtitle sets expectations honestly. "Free for 7 days" without
       * "no card needed" is the sentence people have learned to distrust.
       */
      subtitle="Free for 7 days. No card needed."
      footer={
        <HStack gap={6} justify="center">
          <Text variant="body-sm" tone="tertiary">
            Already have an account?
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="link"
            style={{ paddingVertical: 12, paddingHorizontal: 8 }}
          >
            <Text variant="label" tone="link">
              Sign in
            </Text>
          </Pressable>
        </HStack>
      }
    >
      <VStack gap={16}>
        {formError ? (
          <Banner
            tone="danger"
            title="Couldn't create your account"
            body={formError}
            onDismiss={() => setFormError(null)}
          />
        ) : null}

        <ControlledTextField
          control={control}
          name="firstName"
          label="Your name"
          autoComplete="given-name"
          placeholder="Anita"
          required
        />

        <ControlledTextField
          control={control}
          name="familyName"
          label="Family name"
          hint="What we'll call your household in the app."
          placeholder="Sharma"
          required
        />

        <ControlledTextField
          control={control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />

        <ControlledTextField
          control={control}
          name="password"
          label="Password"
          hint="At least 10 characters. A short phrase works well."
          secureTextEntry
          autoComplete="new-password"
          required
        />

        <ControlledTextField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          secureTextEntry
          autoComplete="new-password"
          required
        />

        {/**
         * Consent is an explicit, unticked checkbox — never pre-checked.
         * This account will hold a child's learning records, and a pre-ticked
         * box is not consent under DPDP however clearly it is worded.
         */}
        <Controller
          control={control}
          name="consent"
          render={({ field: { onChange, value } }) => (
            <VStack gap={6}>
              <Pressable
                onPress={() => onChange(!value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(value) }}
                // See shared/ui/Toggle.tsx: RN Web does not map
                // accessibilityState onto a Pressable, so the aria attribute is
                // passed explicitly. Consent is the last control that should be
                // ambiguous to a screen reader.
                aria-checked={Boolean(value)}
                accessibilityLabel="Accept the privacy terms"
                style={{
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radius.xs,
                    borderWidth: value ? 0 : 1.5,
                    borderColor: errors.consent
                      ? theme.danger.text
                      : theme.border.strong,
                    backgroundColor: value ? theme.brand[600] : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {value ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
                <Text variant="body-sm" tone="secondary" style={{ flex: 1 }}>
                  I'm this child's parent or guardian, and I agree to ParentAI
                  storing their learning progress so I can see it.
                </Text>
              </Pressable>
              {errors.consent ? (
                <Text variant="caption" tone="danger">
                  {errors.consent.message}
                </Text>
              ) : null}
            </VStack>
          )}
        />

        <Button
          label="Create account"
          onPress={handleSubmit(onSubmit)}
          loading={signup.isPending}
        />
      </VStack>
    </AuthLayout>
  );
}

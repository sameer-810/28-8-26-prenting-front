import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "@modules/auth/screens/LoginScreen";
import SignupScreen from "@modules/auth/screens/SignupScreen";
import ForgotPasswordScreen from "@modules/auth/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "@modules/auth/screens/ResetPasswordScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      {/**
       * Reached only from the link in the reset email, never from inside the
       * app. It still has to be registered here: without it the URL falls
       * through to Login and the reset cannot be completed at all.
       */}
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

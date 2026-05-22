import { ContextoProvider } from "@/components/Contexto";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

// Opcional para Android si quieres controlar la barra inferior del sistema
import * as NavigationBar from "expo-navigation-bar";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("#F5F7FA");
      NavigationBar.setButtonStyleAsync("dark");
    }
  }, []);

  return (
    <ContextoProvider>
      <StatusBar style="dark" backgroundColor="#F5F7FA" />
      <Stack screenOptions={{ headerShown: false }} />
    </ContextoProvider>
  );
}
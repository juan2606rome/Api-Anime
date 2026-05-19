import { ContextoProvider } from "@/components/Contexto";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <ContextoProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ContextoProvider>
  );
}
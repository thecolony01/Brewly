// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

// IMPORT THE PROVIDER HERE
import { FavoritesProvider } from "../src/context/FavoritesContext";

const PREMIUM_COLORS = {
  primary: "#4A3219",
  white: "#FFFFFF",
};

export default function Layout() {
  return (
    // WRAP THE ENTIRE APP IN THE PROVIDER
    <FavoritesProvider>
      <StatusBar
        style="light"
        translucent={true}
        backgroundColor="transparent"
      />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: PREMIUM_COLORS.white },
          headerTintColor: PREMIUM_COLORS.primary,
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: PREMIUM_COLORS.white },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="home" />
        <Stack.Screen name="favorites" options={{ title: "My Favorites" }} />
      </Stack>
    </FavoritesProvider>
  );
}

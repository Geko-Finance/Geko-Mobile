import { Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

import { useColorScheme } from "@hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>Explore</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

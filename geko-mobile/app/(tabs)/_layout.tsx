import { Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

import { useTranslation } from "@hooks/general/useTranslation";
import { useColorScheme } from "@hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const translate = useTranslation();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>{translate("helloWorld")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label>{translate("helloWorld")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

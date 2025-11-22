import { Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

import { useBottomNavTab } from "@/src/features/shared/hooks/bottom-nav-tab/useBottomNavTab";
import { useTranslation } from "@/src/features/shared/hooks/general/useTranslation";

export default function TabLayout() {
  const translate = useTranslation();
  const {hidden} = useBottomNavTab();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index" hidden={hidden}>
        <Label>{translate("holaMundo")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" hidden={hidden}>
        <Label>{translate("holaMundo")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

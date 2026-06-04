import { Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function AppTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finances">
        <Label>Finances</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Label>AI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invest">
        <Label>Invest</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

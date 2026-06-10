import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function AppTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon src={require("./assets/tab-home.png")} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finances">
        <NativeTabs.Trigger.Icon src={require("./assets/tab-finances.png")} />
        <NativeTabs.Trigger.Label>Finances</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <NativeTabs.Trigger.Icon src={require("./assets/tab-ai.png")} />
        <NativeTabs.Trigger.Label>AI</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invest">
        <NativeTabs.Trigger.Icon src={require("./assets/tab-invest.png")} />
        <NativeTabs.Trigger.Label>Invest</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

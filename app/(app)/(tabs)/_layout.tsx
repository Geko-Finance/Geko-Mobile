import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function AppTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <Icon src={require("./assets/tab-home.png")} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finances">
        <Icon src={require("./assets/tab-finances.png")} />
        <Label>Finances</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Icon src={require("./assets/tab-ai.png")} />
        <Label>AI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invest">
        <Icon src={require("./assets/tab-invest.png")} />
        <Label>Invest</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon src={require("./assets/tab-profile.png")} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

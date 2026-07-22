import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

// iOS uses SF Symbols (vector, crisp at any resolution) instead of the raster
// tab-*.png assets - those are tiny single-scale bitmaps (~50px, no @2x/@3x),
// so iOS was upscaling them ~3x on Retina displays, which is what caused the
// blurry/pixelated tab bar. Android keeps the existing PNGs via androidSrc
// (sf is iOS-only) - unchanged there, no regression.
export default function AppTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={require("./assets/tab-home.png")}
        />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="finances">
        <Icon
          sf={{ default: "creditcard", selected: "creditcard.fill" }}
          androidSrc={require("./assets/tab-finances.png")}
        />
        <Label>Finances</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Icon
          sf="sparkles"
          androidSrc={require("./assets/tab-ai.png")}
        />
        <Label>AI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invest">
        <Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          androidSrc={require("./assets/tab-invest.png")}
        />
        <Label>Invest</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          androidSrc={require("./assets/tab-profile.png")}
        />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

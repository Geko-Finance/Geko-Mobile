import { Lock } from "lucide-react-native";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from "@/src/features/notifications/api/notification-preferences-queries";
import { BackButton } from "@/src/features/shared/components/BackButton";

type EditablePreferenceKey = keyof UpdateNotificationPreferencesInput;

interface PreferenceRow {
  key: EditablePreferenceKey | "securityAlerts";
  label: string;
  description: string;
  locked?: boolean;
}

const PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: "securityAlerts",
    label: "Security alerts",
    description: "Sign-in attempts, recovery, and account safety.",
    locked: true,
  },
  {
    key: "transactions",
    label: "Transactions",
    description: "Payments sent, received, and wallet activity.",
  },
  {
    key: "priceAlerts",
    label: "Price alerts",
    description: "Asset price changes you may care about.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Promotions, offers, and partner updates.",
  },
  {
    key: "productUpdates",
    label: "Product updates",
    description: "New features and improvements in Geko.",
  },
];

export function NotificationPreferencesScreen() {
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleToggle = (key: EditablePreferenceKey, value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <Text className="mt-4 text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          PROFILE
        </Text>
        <Text className="mt-2 text-[28px] font-extrabold text-white">
          Notifications
        </Text>
        <Text className="mt-2 text-[14px] font-semibold leading-[20px] text-[#8E8E92]">
          Choose which alerts Geko can send to this device.
        </Text>

        <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214]">
          {preferences.isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#5BED97" size="small" />
            </View>
          ) : preferences.isError ? (
            <View className="px-4 py-6">
              <Text className="text-[14px] font-semibold text-[#FF6B6B]">
                Couldn&apos;t load notification preferences. Please try again.
              </Text>
            </View>
          ) : (
            PREFERENCE_ROWS.map((row, index) => {
              const value =
                preferences.data?.[row.key as keyof NotificationPreferences] ??
                false;
              const isLast = index === PREFERENCE_ROWS.length - 1;

              return (
                <View
                  key={row.key}
                  className={`flex-row items-center justify-between px-4 py-4${
                    isLast ? "" : " border-b border-[#1E1E20]"
                  }`}
                >
                  <View className="mr-4 flex-1">
                    <Text className="text-[16px] font-bold text-white">
                      {row.label}
                    </Text>
                    <Text className="mt-1 text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
                      {row.description}
                    </Text>
                  </View>

                  {row.locked ? (
                    <View
                      accessibilityLabel={`${row.label} always enabled`}
                      accessibilityRole="image"
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#123B2B]"
                    >
                      <Lock color="#5BED97" size={16} strokeWidth={2.5} />
                    </View>
                  ) : (
                    <Switch
                      accessibilityLabel={row.label}
                      disabled={updatePreferences.isPending}
                      onValueChange={(nextValue) =>
                        handleToggle(row.key as EditablePreferenceKey, nextValue)
                      }
                      thumbColor="#FFFFFF"
                      trackColor={{ false: "#3A3A3E", true: "#5BED97" }}
                      value={value}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

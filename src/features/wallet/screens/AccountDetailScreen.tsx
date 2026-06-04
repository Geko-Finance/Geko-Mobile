import { useLocalSearchParams } from "expo-router";

import { ScreenPlaceholder } from "@/src/features/shared/components/ScreenPlaceholder";

export function AccountDetailScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();

  return (
    <ScreenPlaceholder
      eyebrow="Wallet"
      title={`Account ${accountId}`}
      description="Account detail route with URL-backed account identity."
    />
  );
}

import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WalletAccount } from "@/src/domain/wallet";
import { useSession } from "@/src/features/auth/session/SessionProvider";
import { useRecoverWithCode } from "@/src/features/profile/api/recovery-queries";
import { BackButton } from "@/src/features/shared/components/BackButton";
import { useConnectCustodialWallet } from "@/src/features/wallet/api/wallet-queries";

function getFriendlyErrorMessage(error: Error | null): string | null {
  if (error === null) {
    return null;
  }

  switch (error.name) {
    case "CavosProviderUnavailableError":
      return "Cavos is temporarily unavailable - please try again in a moment.";
    case "CavosSessionExpiredError":
      return "This device needs approval - please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function CustodialOnboardingScreen() {
  const router = useRouter();
  const { session } = useSession();
  const connectCustodialWallet = useConnectCustodialWallet();
  const recoverWithCode = useRecoverWithCode();
  const hasStartedConnecting = useRef(false);

  const [pendingApprovalAccount, setPendingApprovalAccount] =
    useState<WalletAccount | null>(null);
  const [revealedRecoveryCode, setRevealedRecoveryCode] = useState<
    string | null
  >(null);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");

  const finishOnboarding = () => {
    router.replace("/home");
  };

  const connect = () => {
    if (session === null) {
      return;
    }

    connectCustodialWallet.mutate(
      { name: session.user.name },
      {
        onSuccess: ({ account, needsDeviceApproval, recoveryCode }) => {
          if (recoveryCode !== undefined) {
            setRevealedRecoveryCode(recoveryCode);
            if (needsDeviceApproval) {
              setPendingApprovalAccount(account);
            }
            return;
          }

          if (needsDeviceApproval) {
            setPendingApprovalAccount(account);
            return;
          }

          finishOnboarding();
        },
      }
    );
  };

  // Wallet setup is fully automatic once the user is authenticated — no manual
  // create/recover step needed; POST /wallets covers first-time creation.
  useEffect(() => {
    if (hasStartedConnecting.current || session === null) {
      return;
    }

    hasStartedConnecting.current = true;
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleRetry = () => {
    connectCustodialWallet.reset();
    connect();
  };

  const handleConfirmRecoveryCodeSaved = () => {
    setRevealedRecoveryCode(null);

    if (pendingApprovalAccount !== null) {
      return;
    }

    finishOnboarding();
  };

  const handleApproveDevice = () => {
    if (pendingApprovalAccount === null) {
      return;
    }

    recoverWithCode.mutate(
      { account: pendingApprovalAccount, code: recoveryCodeInput.trim() },
      { onSuccess: () => finishOnboarding() }
    );
  };

  const inlineError = connectCustodialWallet.isError
    ? getFriendlyErrorMessage(connectCustodialWallet.error)
    : null;

  const showRecoveryReveal = revealedRecoveryCode !== null;
  const showDeviceApproval =
    !showRecoveryReveal && pendingApprovalAccount !== null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <BackButton />
        </View>
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          ONBOARDING
        </Text>

        <Text className="mt-2 text-[28px] font-extrabold leading-[34px] text-white">
          Setting up your wallet
        </Text>

        <Text className="mt-3 text-[15px] font-semibold leading-[22px] text-[#8E8E92]">
          Geko is creating a Stellar wallet for you and keeping the keys
          secure with Cavos - no seed phrase to write down.
        </Text>

        {showRecoveryReveal ? (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
            <Text className="text-[16px] font-bold text-white">
              Save your recovery code
            </Text>
            <Text className="mt-2 text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
              This code is shown only once and can&apos;t be retrieved later.
              Store it somewhere safe — you&apos;ll need it to approve a new
              device.
            </Text>
            <View className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3">
              <Text
                className="text-[15px] font-bold text-white"
                selectable
              >
                {revealedRecoveryCode}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
              onPress={handleConfirmRecoveryCodeSaved}
            >
              <Text className="text-[14px] font-bold text-white">
                I&apos;ve saved it
              </Text>
            </Pressable>
          </View>
        ) : showDeviceApproval ? (
          <View className="mt-6 overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
            <Text className="text-[16px] font-bold text-white">
              Approve this device
            </Text>
            <Text className="mt-2 text-[13px] font-semibold leading-[18px] text-[#8E8E92]">
              This wallet doesn&apos;t recognize this device yet. Enter its
              recovery code to approve it and finish setting up your wallet.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
              placeholder="Recovery code"
              placeholderTextColor="#6E6E72"
              value={recoveryCodeInput}
              onChangeText={setRecoveryCodeInput}
            />

            {recoverWithCode.isError ? (
              <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
                That code didn&apos;t work - please check it and try again.
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className="mt-4 self-start rounded-full bg-[#237BFF] px-4 py-2.5"
              disabled={
                recoveryCodeInput.trim().length === 0 ||
                recoverWithCode.isPending
              }
              onPress={handleApproveDevice}
            >
              {recoverWithCode.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-[14px] font-bold text-white">
                    Approving…
                  </Text>
                </View>
              ) : (
                <Text className="text-[14px] font-bold text-white">
                  Approve device
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 items-center overflow-hidden rounded-[20px] bg-[#121214] px-4 py-8">
            {inlineError !== null ? (
              <>
                <Text className="text-center text-[13px] font-semibold text-[#FF6B6B]">
                  {inlineError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="mt-4 self-start rounded-full bg-[#242426] px-4 py-2.5"
                  onPress={handleRetry}
                >
                  <Text className="text-[14px] font-bold text-white">
                    Try again
                  </Text>
                </Pressable>
              </>
            ) : (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-[14px] font-bold text-white">
                  Creating your wallet…
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

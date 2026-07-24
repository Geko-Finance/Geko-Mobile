import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/features/auth/session/SessionProvider";

/**
 * Shown when status is `locked`: a stored session exists, but Face ID /
 * Touch ID has not unlocked this launch/foreground yet.
 */
export function UnlockScreen() {
  const { unlock, signOut } = useSession();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [failed, setFailed] = useState(false);
  const didAutoPrompt = useRef(false);

  const handleUnlock = useCallback(async () => {
    setIsUnlocking(true);
    setFailed(false);

    try {
      await unlock();
    } catch {
      setFailed(true);
    } finally {
      setIsUnlocking(false);
    }
  }, [unlock]);

  useEffect(() => {
    if (didAutoPrompt.current) {
      return;
    }

    didAutoPrompt.current = true;
    void handleUnlock();
  }, [handleUnlock]);

  return (
    <ImageBackground
      source={require("@/src/assets/images/welcome/welcome-bg.png")}
      className="flex-1 bg-[#070812]"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-end px-[22px] pb-[22px]">
          <Text className="mb-[14px] text-[13px] font-bold text-slate-50">
            Geko
          </Text>

          <Text className="text-[30px] font-extrabold leading-[35px] text-slate-50">
            Unlock Geko
          </Text>

          <Text className="mt-2.5 text-[13px] leading-[18px] text-[#B7C0D1]">
            Use Face ID or Touch ID to open your wallet.
          </Text>

          {failed ? (
            <Text className="mt-4 text-[13px] font-semibold text-[#FF6B6B]">
              Couldn&apos;t unlock — try again.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            className="mt-[18px] h-12 items-center justify-center rounded-[11px] bg-[#237BFF]"
            disabled={isUnlocking}
            onPress={handleUnlock}
          >
            {isUnlocking ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-sm font-bold text-white">
                  Waiting for Face ID…
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-white">Unlock</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-3 h-10 items-center justify-center"
            disabled={isUnlocking}
            onPress={() => {
              void signOut();
            }}
          >
            <Text className="text-sm font-bold text-slate-50">Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

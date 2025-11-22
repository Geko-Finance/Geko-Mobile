import { Button } from "@/src/features/shared/components/ui/button";
import { ScreenContainer } from "@/src/features/shared/components/ui/screen-container";
import { UserBottomSheet } from "@/src/features/user/components/UserBottomSheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { router } from "expo-router";
import { useRef } from "react";

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheetMethods>(null);

  return (
    <ScreenContainer className="bg-black">
      <Button
        size="lg"
        className="bg-red-500"
        onPress={() => {
          router.push("/home");
          (bottomSheetRef as any)?.current?.expand();
        }}
        value="open"
      />
      <UserBottomSheet ref={bottomSheetRef} />
    </ScreenContainer>
  );
}

import { Button } from "@/src/features/shared/components/ui/button";
import { ScreenContainer } from "@/src/features/shared/components/ui/screen-container";
import { useBottomNavTab } from "@/src/features/shared/hooks/bottom-nav-tab/useBottomNavTab";
import { UserBottomSheet } from "@/src/features/user/components/UserBottomSheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useRef } from "react";

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const { hideTabs } = useBottomNavTab();

  return (
    <ScreenContainer className="items-center justify-center bg-black">
      <Button
        size="lg"
        className="bg-blue-500"
        onPress={() => {
          hideTabs();
          (bottomSheetRef as any)?.current?.expand();
        }}
        value="open"
      />
      <UserBottomSheet ref={bottomSheetRef} />
    </ScreenContainer>
  );
}

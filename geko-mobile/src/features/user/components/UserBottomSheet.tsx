import { BottomSheetView } from "@/src/features/shared/components/ui/bottom-sheet";
import { Text } from "@/src/features/shared/components/ui/text";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { forwardRef } from "react";
import { Button } from "@shared/components/ui/button";
import { VStack } from "@shared/components/ui/vstack";

export const UserBottomSheet = forwardRef(
  ({}, forwardedRef: React.Ref<BottomSheetMethods>) => {
    return (
      <BottomSheetView
        ref={forwardedRef}
        backgroundColor="black"
        borderTopRadius={16}
        backdropOpacity={0.25}
      >
        <VStack space="lg" className="px-4 items-center justify-center py-10">
          <Text>Hello World</Text>
          <Button
            size="lg"
            onPress={() => (forwardedRef as any)?.current?.close()}
            value="close"
          />
          <Text>Hello World</Text>
          <Button
            size="full"
            onPress={() => (forwardedRef as any)?.current?.close()}
            value="close"
          />
          <Text>Hello World</Text>
          <Button
            size="lg"
            onPress={() => (forwardedRef as any)?.current?.close()}
            value="close"
          />
        </VStack>
      </BottomSheetView>
    );
  }
);

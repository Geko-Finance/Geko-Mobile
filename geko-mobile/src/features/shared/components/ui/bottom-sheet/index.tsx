import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import React from "react";
import { Keyboard, Pressable, ViewStyle } from "react-native";

type BackdropPressBehavior = "close" | "collapse" | "none";

interface IBottomSheetProps {
  percentSize?: string;
  backdropOpacity?: number;
  backgroundColor?: string;
  enablePanningGesture?: boolean;
  handleIndicatorStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  borderTopRadius?: number;
  showCloseIndicator?: boolean;
  backdropPressBehavior?: BackdropPressBehavior;
  children?: React.ReactNode;
  onClose?: () => void;
}

const DEFAULT_HANDLE_STYLE: ViewStyle = {
  backgroundColor: "#E5E7EB",
  marginTop: 5,
  width: 35,
  borderWidth: 3,
  borderColor: "#E5E7EB",
  alignSelf: "center",
  borderRadius: 9999,
};

export const BottomSheetView = React.forwardRef<
  BottomSheetMethods,
  IBottomSheetProps
>(function BottomSheetView(
  {
    children,
    backdropOpacity = 0.2,
    backgroundColor = "#FFFFFF",
    backdropPressBehavior = "close",
    enablePanningGesture = true,
    handleIndicatorStyle = DEFAULT_HANDLE_STYLE,
    containerStyle,
    borderTopRadius,
    showCloseIndicator = true,
    onClose,
  },
  ref
) {
  return (
    <BottomSheet
      ref={ref}
      onClose={onClose}
      animateOnMount={false}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          opacity={backdropOpacity}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={backdropPressBehavior}
        />
      )}
      enableContentPanningGesture={enablePanningGesture}
      enableHandlePanningGesture={enablePanningGesture}
      enablePanDownToClose={enablePanningGesture}
      handleIndicatorStyle={handleIndicatorStyle}
      backgroundStyle={{
        backgroundColor,
        borderTopLeftRadius: borderTopRadius,
        borderTopRightRadius: borderTopRadius,
        ...(containerStyle ?? {}),
      }}
      index={-1}
      handleComponent={showCloseIndicator ? BottomSheetHandle : null}
      enableDynamicSizing={true}
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <Pressable onPress={Keyboard.dismiss}>{children}</Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export type { IBottomSheetProps };

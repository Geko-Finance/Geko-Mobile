import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";

export const useBottomSheet = (ref?: React.Ref<BottomSheetMethods>) => {
  const closeBottomSheet = () => {
    (ref as any)?.current?.close();
  };

  const openBottomSheet = () => {
    (ref as any)?.current?.expand();
  };

  return {
    closeBottomSheet,
    openBottomSheet,
  };
};

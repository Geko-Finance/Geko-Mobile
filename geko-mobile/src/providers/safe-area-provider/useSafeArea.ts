import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';

export const useSafeArea = () => {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();

  return {
    insets,
    frame,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
};


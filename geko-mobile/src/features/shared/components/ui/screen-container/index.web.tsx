import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { SafeAreaView } from 'react-native-safe-area-context';

import { screenContainerStyle } from './styles';

type IScreenContainerProps = Omit<
  React.ComponentProps<typeof SafeAreaView>,
  'edges'
> &
  VariantProps<typeof screenContainerStyle> & {
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
    safeArea?: boolean;
  };

const ScreenContainer = React.forwardRef<
  React.ComponentRef<typeof SafeAreaView>,
  IScreenContainerProps
>(function ScreenContainer(
  {
    className,
    variant,
    edges = ['top', 'bottom', 'left', 'right'],
    safeArea = true,
    style,
    ...props
  },
  ref
) {
  const computedEdges = safeArea ? edges : [];

  return (
    <SafeAreaView
      edges={computedEdges}
      className={screenContainerStyle({
        variant,
        class: className,
      })}
      style={[{ flex: 1 }, style]}
      {...props}
      ref={ref}
    />
  );
});

ScreenContainer.displayName = 'ScreenContainer';

export { ScreenContainer };


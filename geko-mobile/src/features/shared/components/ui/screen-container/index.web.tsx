import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageBackground } from 'react-native';
import type { ImageSourcePropType, ImageStyle } from 'react-native';

import { screenContainerStyle } from './styles';

type IScreenContainerProps = Omit<
  React.ComponentProps<typeof SafeAreaView>,
  'edges'
> &
  VariantProps<typeof screenContainerStyle> & {
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
    safeArea?: boolean;
    backgroundImage?: ImageSourcePropType;
    backgroundImageStyle?: ImageStyle;
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
    backgroundImage,
    backgroundImageStyle,
    children,
    ...props
  },
  ref
) {
  const computedEdges = safeArea ? edges : [];

  const containerContent = (
    <SafeAreaView
      edges={computedEdges}
      className={screenContainerStyle({
        variant,
        class: className,
      })}
      style={[{ flex: 1 }, style]}
      {...props}
      ref={ref}
    >
      {children}
    </SafeAreaView>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={[{ flex: 1 }, backgroundImageStyle]}
        resizeMode="cover"
      >
        {containerContent}
      </ImageBackground>
    );
  }

  return containerContent;
});

ScreenContainer.displayName = 'ScreenContainer';

export { ScreenContainer };


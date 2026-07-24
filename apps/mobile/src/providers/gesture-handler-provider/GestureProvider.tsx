import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

interface Props {
  children?: React.ReactNode;
}

export const GestureHandlerProvider = ({children}: Props) => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      {children}
    </GestureHandlerRootView>
  );
};

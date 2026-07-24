import React from 'react';
import {
  SafeAreaProvider as RNSafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

interface SafeAreaProviderProps {
  children?: React.ReactNode;
}

export const SafeAreaProvider = ({ children }: SafeAreaProviderProps) => {
  return (
    <RNSafeAreaProvider initialMetrics={initialWindowMetrics}>
      {children}
    </RNSafeAreaProvider>
  );
};


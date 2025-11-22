"use client";
import React from "react";
import { View as RNView } from "react-native";

type IViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

const View = React.forwardRef<React.ComponentRef<typeof RNView>, IViewProps>(
  ({ className, ...props }, ref) => (
    <RNView className={className} {...props} ref={ref} />
  )
);

View.displayName = "View";

export { View };

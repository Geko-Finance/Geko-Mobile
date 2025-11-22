import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type BottomNavTabContextValue = {
  hidden: boolean;
  hideTabs: () => void;
  showTabs: () => void;
  toggleTabs: () => void;
  setHidden: (nextHidden: boolean) => void;
};

const BottomNavTabContext = createContext<BottomNavTabContextValue | undefined>(
  undefined
);

export const BottomNavTabProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [hidden, setHidden] = useState<boolean>(false);

  const hideTabs = useCallback(() => setHidden(true), []);
  const showTabs = useCallback(() => setHidden(false), []);
  const toggleTabs = useCallback(() => setHidden((prev) => !prev), []);

  const value = useMemo<BottomNavTabContextValue>(
    () => ({ hidden, hideTabs, showTabs, toggleTabs, setHidden }),
    [hidden, hideTabs, showTabs, toggleTabs]
  );

  return (
    <BottomNavTabContext.Provider value={value}>
      {children}
    </BottomNavTabContext.Provider>
  );
};

export const useBottomNavTab = (): BottomNavTabContextValue => {
  const ctx = useContext(BottomNavTabContext);
  if (!ctx) {
    throw new Error(
      "useBottomNavTab must be used within a BottomNavTabProvider"
    );
  }
  return ctx;
};

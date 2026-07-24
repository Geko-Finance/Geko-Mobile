import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text } from "react-native";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function QuickAction({
  icon: Icon,
  label,
  onPress,
  disabled,
}: QuickActionProps) {
  return (
    <Pressable
      className={`h-[82px] flex-1 justify-between rounded-[15px] bg-[#1D1D1F] px-3.5 py-3.5${disabled ? " opacity-40" : ""}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon color="#FFFFFF" size={21} strokeWidth={3} />
      <Text
        className="text-[15px] font-bold leading-[18px] text-[#9D9D9F]"
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {label}
      </Text>
    </Pressable>
  );
}

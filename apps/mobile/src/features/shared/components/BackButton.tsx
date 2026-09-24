import { ChevronLeft } from "lucide-react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";

export function BackButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className="h-9 w-9 items-center justify-center rounded-full bg-[#1E1E20]"
      onPress={() => {
        // Screens reached through router.replace (e.g. a freshly created wallet) can sit
        // alone in the stack; back() would be a silent no-op there and strand the user.
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace("/home");
      }}
    >
      <ChevronLeft color="#FFFFFF" size={20} strokeWidth={2.5} />
    </Pressable>
  );
}

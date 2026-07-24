import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { formatContactAddress } from "../utils/format";

export interface SaveContactPromptProps {
  /** Controls visibility; the caller (e.g. Send, after a successful payment) owns this state. */
  visible: boolean;
  address: string;
  onDismiss: () => void;
  /** Caller persists the contact (e.g. via `useCreateContact()`) and closes the prompt. */
  onSave: (label: string) => void;
}

/** Stable "save this address to contacts" prompt for post-send flows to reuse. */
export function SaveContactPrompt({
  visible,
  address,
  onDismiss,
  onSave,
}: SaveContactPromptProps) {
  const [label, setLabel] = useState("");

  const handleSave = () => {
    const trimmed = label.trim();

    if (trimmed === "") {
      return;
    }

    onSave(trimmed);
    setLabel("");
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onDismiss}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full rounded-[20px] bg-[#121214] p-5">
          <Text className="text-[18px] font-extrabold text-white">
            Save this address?
          </Text>
          <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
            {formatContactAddress(address)}
          </Text>

          <TextInput
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect={false}
            className="mt-4 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="Contact name"
            placeholderTextColor="#6E6E72"
            value={label}
            onChangeText={setLabel}
          />

          <View className="mt-4 flex-row gap-3">
            <Pressable
              accessibilityLabel="Not now"
              accessibilityRole="button"
              className="flex-1 items-center rounded-full border border-[#303033] py-3"
              onPress={onDismiss}
            >
              <Text className="text-[14px] font-bold text-[#D8D8DC]">Not now</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Save contact"
              accessibilityRole="button"
              className="flex-1 items-center rounded-full bg-[#242426] py-3"
              disabled={label.trim() === ""}
              onPress={handleSave}
            >
              <Text className="text-[14px] font-bold text-white">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

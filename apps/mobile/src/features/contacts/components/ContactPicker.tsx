import { Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { Contact } from "@/src/domain/contacts";
import type { StellarNetworkId } from "@/src/domain/wallet";

import { useContacts } from "../api/contacts-queries";
import { formatContactAddress } from "../utils/format";

export interface ContactPickerProps {
  /** Controls visibility; the caller (e.g. the Send flow) owns this state. */
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  /** When set, only contacts saved on this network are shown. */
  networkId?: StellarNetworkId;
}

/**
 * Stable recipient-picker API for Send/Swap/CCTP/QR flows to reuse: reads from the shared
 * contacts query cache, so callers only need to render it and handle `onSelect`.
 */
export function ContactPicker({
  visible,
  onClose,
  onSelect,
  networkId,
}: ContactPickerProps) {
  const contacts = useContacts();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return contacts
      .filter((contact) => networkId === undefined || contact.network === networkId)
      .filter(
        (contact) =>
          trimmed === "" ||
          contact.label.toLowerCase().includes(trimmed) ||
          contact.address.toLowerCase().includes(trimmed)
      )
      .sort(
        (a, b) => Number(b.favorite) - Number(a.favorite) || a.label.localeCompare(b.label)
      );
  }, [contacts, networkId, query]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[80%] rounded-t-[24px] bg-[#121214] px-5 pb-8 pt-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-white">
              Select contact
            </Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
            >
              <Text className="text-[14px] font-bold text-[#8E8E92]">Close</Text>
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-[#1E1E20] px-4 py-3">
            <Search color="#6E6E72" size={16} strokeWidth={2.25} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-[15px] font-semibold text-white"
              placeholder="Search contacts"
              placeholderTextColor="#6E6E72"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {filtered.length === 0 ? (
            <Text className="mt-6 text-center text-[14px] font-semibold text-[#8E8E92]">
              No contacts found
            </Text>
          ) : (
            <ScrollView className="mt-2" showsVerticalScrollIndicator={false}>
              {filtered.map((contact) => (
                <Pressable
                  key={contact.id}
                  accessibilityLabel={`Select ${contact.label}`}
                  accessibilityRole="button"
                  className="border-b border-[#1E1E20] py-3.5"
                  onPress={() => onSelect(contact)}
                >
                  <Text className="text-[15px] font-bold text-white">
                    {contact.favorite ? "★ " : ""}
                    {contact.label}
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-semibold text-[#8E8E92]">
                    {formatContactAddress(contact.address)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

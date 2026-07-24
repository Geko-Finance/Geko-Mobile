import { Pencil, Search, Star, Trash2, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Contact } from "@/src/domain/contacts";
import { makeContact } from "@/src/domain/contacts";
import { isValidStellarAddress } from "@/src/services/api/stellar/address-validation";
import { ApiError } from "@/src/services/api/api-errors";

import { useActiveNetworkId } from "../../wallet/api/wallet-queries";
import {
  useContacts,
  useCreateContact,
  useRemoveContact,
  useToggleFavorite,
  useUpdateContact,
} from "../api/contacts-queries";
import { formatContactAddress } from "../utils/format";

interface ContactFormState {
  label: string;
  address: string;
  memo: string;
}

const EMPTY_FORM: ContactFormState = { address: "", label: "", memo: "" };

function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) => Number(b.favorite) - Number(a.favorite) || a.label.localeCompare(b.label)
  );
}

function contactAlreadyExistsMessage(): string {
  return "This address is already saved on this network.";
}

export function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const contacts = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const removeContact = useRemoveContact();
  const toggleFavorite = useToggleFavorite();
  const networkId = useActiveNetworkId();

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const visibleContacts = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const filtered =
      trimmed === ""
        ? contacts
        : contacts.filter(
            (contact) =>
              contact.label.toLowerCase().includes(trimmed) ||
              contact.address.toLowerCase().includes(trimmed)
          );

    return sortContacts(filtered);
  }, [contacts, query]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingContact(null);
    setValidationError(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      address: contact.address,
      label: contact.label,
      memo: contact.memo ?? "",
    });
    setValidationError(null);
  };

  const handleDelete = (contact: Contact) => {
    Alert.alert("Remove contact?", contact.label, [
      { text: "Cancel", style: "cancel" },
      {
        onPress: () => {
          removeContact.mutate(contact.id);
          if (editingContact?.id === contact.id) {
            resetForm();
          }
        },
        style: "destructive",
        text: "Remove",
      },
    ]);
  };

  const handleSubmit = async () => {
    const label = form.label.trim();
    const address = form.address.trim();
    const network = editingContact?.network ?? networkId;

    if (label === "") {
      setValidationError("Give this contact a name.");
      return;
    }

    if (!isValidStellarAddress(address)) {
      setValidationError("That doesn't look like a valid Stellar address.");
      return;
    }

    const duplicate = contacts.find(
      (entry) =>
        entry.address === address &&
        entry.network === network &&
        entry.id !== editingContact?.id
    );

    if (duplicate !== undefined) {
      setValidationError(`This address is already saved as "${duplicate.label}".`);
      return;
    }

    try {
      if (editingContact !== null) {
        await updateContact.mutateAsync({
          address,
          id: editingContact.id,
          label,
          memo: form.memo,
        });
      } else {
        await createContact.mutateAsync(
          makeContact({
            address,
            label,
            memo: form.memo,
            network: networkId,
          })
        );
      }

      resetForm();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setValidationError(contactAlreadyExistsMessage());
        return;
      }

      throw error;
    }
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-bold uppercase tracking-wide text-[#8E8E92]">
          CONTACTS
        </Text>
        <Text className="mt-2 text-[32px] font-extrabold text-white">
          Contacts
        </Text>

        <View className="mt-6 flex-row items-center gap-2 rounded-xl bg-[#121214] px-4 py-3">
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

        <View className="mt-4 overflow-hidden rounded-[20px] bg-[#121214]">
          {visibleContacts.length === 0 ? (
            <Text className="px-4 py-5 text-[15px] font-semibold text-[#8E8E92]">
              {contacts.length === 0 ? "No contacts yet" : "No contacts match your search"}
            </Text>
          ) : (
            visibleContacts.map((contact, index) => (
              <View
                key={contact.id}
                className={`flex-row items-center ${
                  index < visibleContacts.length - 1 ? "border-b border-[#1E1E20]" : ""
                }`}
              >
                <Pressable
                  accessibilityLabel={`Edit ${contact.label}`}
                  accessibilityRole="button"
                  className="min-h-[72px] flex-1 px-4 py-4"
                  onPress={() => handleEdit(contact)}
                >
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="text-[16px] font-bold text-white">
                      {contact.label}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[13px] font-semibold text-[#8E8E92]">
                    {formatContactAddress(contact.address)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={
                    contact.favorite
                      ? `Unfavorite ${contact.label}`
                      : `Favorite ${contact.label}`
                  }
                  accessibilityRole="button"
                  className="px-3 py-4"
                  hitSlop={8}
                  onPress={() => toggleFavorite.mutate(contact.id)}
                >
                  <Star
                    color={contact.favorite ? "#5BED97" : "#8E8E92"}
                    fill={contact.favorite ? "#5BED97" : "none"}
                    size={18}
                    strokeWidth={2.25}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${contact.label}`}
                  accessibilityRole="button"
                  className="px-3 py-4"
                  hitSlop={8}
                  onPress={() => handleDelete(contact)}
                >
                  <Trash2 color="#8E8E92" size={18} strokeWidth={2.25} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View className="mb-3 mt-6 flex-row items-center justify-between">
          <Text className="text-[20px] font-extrabold text-white">
            {editingContact === null ? "Add contact" : "Edit contact"}
          </Text>
          {editingContact !== null ? (
            <Pressable
              accessibilityLabel="Cancel edit"
              accessibilityRole="button"
              hitSlop={8}
              onPress={resetForm}
            >
              <X color="#8E8E92" size={18} strokeWidth={2.25} />
            </Pressable>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-[20px] bg-[#121214] px-4 py-4">
          <TextInput
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect={false}
            className="rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="Name"
            placeholderTextColor="#6E6E72"
            value={form.label}
            onChangeText={(label) => setForm((prev) => ({ ...prev, label }))}
          />
          <TextInput
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="G… address"
            placeholderTextColor="#6E6E72"
            value={form.address}
            onChangeText={(address) => setForm((prev) => ({ ...prev, address }))}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            className="mt-3 rounded-xl bg-[#1E1E20] px-4 py-3 text-[15px] font-semibold text-white"
            placeholder="Memo (optional)"
            placeholderTextColor="#6E6E72"
            value={form.memo}
            onChangeText={(memo) => setForm((prev) => ({ ...prev, memo }))}
          />

          {validationError !== null ? (
            <Text className="mt-3 text-[13px] font-semibold text-[#FF6B6B]">
              {validationError}
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel={editingContact === null ? "Add contact" : "Save contact"}
            accessibilityRole="button"
            className="mt-4 flex-row items-center gap-2 self-start rounded-full bg-[#242426] px-4 py-2.5"
            onPress={handleSubmit}
          >
            {editingContact !== null ? (
              <Pencil color="#FFFFFF" size={14} strokeWidth={2.25} />
            ) : null}
            <Text className="text-[14px] font-bold text-white">
              {editingContact === null ? "Add contact" : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

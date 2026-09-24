import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { CctpChain } from "@/src/domain/cctp";
import { useAccountBalances, useActiveNetworkId } from "@/src/features/wallet/api/wallet-queries";
import { usdcIssuer } from "@/src/services/api/cctp";
import { cctpChainDisplayName } from "@/src/services/api/explorers";

import { buildInboundInstructions, hasUsdcTrustline } from "../api/inbound-instructions";

interface InboundInstructionsPanelProps {
  readonly chain: CctpChain;
  readonly stellarPublicKey: string;
}

interface CopyRowProps {
  readonly label: string;
  readonly hint?: string;
  readonly value: string;
}

function CopyRow({ label, hint, value }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  return (
    <View className="mt-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-[#8E8E92]">{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label}`}
          className="rounded-full bg-[#1E1E20] px-3 py-1"
          onPress={async () => {
            await Clipboard.setStringAsync(value);
            setCopied(true);
          }}
        >
          <Text className="text-[12px] font-bold text-[#237BFF]">{copied ? "Copied" : "Copy"}</Text>
        </Pressable>
      </View>
      {hint !== undefined ? (
        <Text className="mt-1 text-[12px] leading-4 text-[#6E6E72]">{hint}</Text>
      ) : null}
      <Text className="mt-1 text-[12px] font-semibold text-white" numberOfLines={2} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

/**
 * Step one of "receive USDC from another network": the values the user's wallet on
 * the other network needs so the USDC arrives in this Stellar account.
 */
export function InboundInstructionsPanel({ chain, stellarPublicKey }: InboundInstructionsPanelProps) {
  const router = useRouter();
  const networkId = useActiveNetworkId();
  const balances = useAccountBalances(stellarPublicKey);
  const instructions = buildInboundInstructions(networkId, stellarPublicKey);
  const chainName = cctpChainDisplayName(chain.id, networkId);
  const missingTrustline =
    balances.data !== undefined && !hasUsdcTrustline(balances.data, networkId);

  return (
    <View className="mt-6 rounded-[20px] bg-[#121214] px-5 py-5">
      <Text className="text-[15px] font-bold text-white">{`1. Send from your ${chainName} wallet`}</Text>
      <Text className="mt-1 text-[12px] leading-4 text-[#6E6E72]">
        {`Use Circle's cross-network transfer in your ${chainName} wallet and enter these details exactly.`}
      </Text>

      {missingTrustline ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 rounded-[16px] bg-[#2A1F12] px-4 py-3"
          onPress={() =>
            router.push({
              pathname: "/payments/add-asset",
              params: { code: "USDC", issuer: usdcIssuer(networkId) },
            })
          }
        >
          <Text className="text-[13px] font-semibold text-[#F2B84B]">
            This wallet can&apos;t hold USDC yet. Tap here to add USDC before sending.
          </Text>
        </Pressable>
      ) : null}

      <CopyRow label="Destination network code" value={String(instructions.destinationDomain)} />
      <CopyRow
        label="Recipient"
        hint="Use this same value for the destination caller."
        value={instructions.forwarderRecipient}
      />
      <CopyRow
        label="Extra data"
        hint="Tells Circle which Stellar wallet gets the USDC - this one."
        value={instructions.hookData}
      />
    </View>
  );
}

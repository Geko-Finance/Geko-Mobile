export type KycStatus = "not_started" | "in_review" | "approved" | "rejected";

export interface KycState {
  status: KycStatus;
  updatedAt?: string;
}

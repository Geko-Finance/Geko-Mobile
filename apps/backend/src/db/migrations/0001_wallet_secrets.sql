CREATE TABLE "wallet_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_secrets_wallet_id_purpose_unique" UNIQUE("wallet_id","purpose")
);
--> statement-breakpoint
ALTER TABLE "wallet_secrets" ADD CONSTRAINT "wallet_secrets_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_secrets_wallet_id_idx" ON "wallet_secrets" USING btree ("wallet_id");
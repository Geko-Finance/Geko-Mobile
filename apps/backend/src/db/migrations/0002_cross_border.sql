CREATE TYPE "public"."cross_border_network" AS ENUM('STELLAR', 'SOLANA', 'CELO');--> statement-breakpoint
CREATE TYPE "public"."cross_border_payment_method" AS ENUM('BREB', 'PIX');--> statement-breakpoint
CREATE TYPE "public"."cross_border_status" AS ENUM('AWAITING_PAYMENT', 'PROCESSING_PAYMENT', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'WRONG_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."cross_border_target_currency" AS ENUM('COP', 'BRL');--> statement-breakpoint
CREATE TABLE "cross_border_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid,
	"abroad_transaction_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"transaction_reference" text NOT NULL,
	"status" "cross_border_status" DEFAULT 'AWAITING_PAYMENT' NOT NULL,
	"network" "cross_border_network" DEFAULT 'STELLAR' NOT NULL,
	"payment_method" "cross_border_payment_method" NOT NULL,
	"target_currency" "cross_border_target_currency" NOT NULL,
	"account_number" text NOT NULL,
	"bank_code" text,
	"tax_id" text,
	"kyc_link" text,
	"on_chain_tx_hash" text,
	"refund_on_chain_id" text,
	"last_webhook_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cross_border_transactions_abroad_transaction_id_unique" UNIQUE("abroad_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "cross_border_transactions" ADD CONSTRAINT "cross_border_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_border_transactions" ADD CONSTRAINT "cross_border_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cross_border_transactions_user_id_idx" ON "cross_border_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cross_border_transactions_status_idx" ON "cross_border_transactions" USING btree ("status");
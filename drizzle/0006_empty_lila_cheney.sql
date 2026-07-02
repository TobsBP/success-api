ALTER TABLE "expenses" ADD COLUMN "billing_date" timestamp;--> statement-breakpoint
UPDATE "expenses" SET "billing_date" = "date" WHERE "billing_date" IS NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "billing_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "card_closing_day" integer;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "card_due_day" integer;
ALTER TABLE "expenses" ALTER COLUMN "payment_method" SET DEFAULT 'debit';--> statement-breakpoint
UPDATE "expenses" SET "payment_method" = 'debit' WHERE "payment_method" IS NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "payment_method" SET NOT NULL;
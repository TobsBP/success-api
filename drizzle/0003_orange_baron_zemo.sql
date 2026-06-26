CREATE TYPE "public"."category_type" AS ENUM('income', 'expense', 'both');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "category_type" DEFAULT 'both' NOT NULL,
	"color" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_name_unique" UNIQUE("user_id","name")
);

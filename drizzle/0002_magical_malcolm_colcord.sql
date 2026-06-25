CREATE TYPE "public"."income_status" AS ENUM('pending', 'received');--> statement-breakpoint
CREATE TYPE "public"."goal_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('BRL', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light', 'system');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"date" timestamp NOT NULL,
	"description" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"limit_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_limit_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "investment_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"asset_class" varchar(100) NOT NULL,
	"subtitle" varchar(255),
	"current_balance" numeric NOT NULL,
	"total_invested" numeric,
	"average_price" numeric,
	"monthly_yield_amount" numeric DEFAULT '0' NOT NULL,
	"monthly_yield_percent" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"priority" "goal_priority" DEFAULT 'medium' NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"target_amount" integer NOT NULL,
	"icon" varchar(50) DEFAULT 'shield' NOT NULL,
	"color" varchar(50) DEFAULT 'primary' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projection_assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"planned_monthly_contribution" integer DEFAULT 0 NOT NULL,
	"estimated_annual_rate_percent" numeric(5, 2) DEFAULT '8.5' NOT NULL,
	"inflation_percent" numeric(5, 2) DEFAULT '4.5' NOT NULL,
	"contribution_growth_percent" numeric(5, 2) DEFAULT '5.5' NOT NULL,
	"returns_by_class" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projection_assumptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"full_name" varchar(255) DEFAULT '' NOT NULL,
	"birth_date" varchar(20),
	"avatar_url" varchar(500),
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"due_date_alerts" boolean DEFAULT true NOT NULL,
	"goals_achieved" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_method" varchar(50),
	"password_last_changed" varchar(50) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "income" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."income_status";--> statement-breakpoint
ALTER TABLE "income" ALTER COLUMN "status" SET DATA TYPE "public"."income_status" USING "status"::"public"."income_status";--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "user_id" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "income" ADD COLUMN "amount" numeric NOT NULL;
CREATE TABLE "game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"game_date" date NOT NULL,
	"won" boolean NOT NULL,
	"attempts" integer NOT NULL,
	"max_attempts" integer NOT NULL,
	"points" integer,
	"source" text NOT NULL,
	"raw_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_results_player_game_date" UNIQUE("player_id","game_id","game_date")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_results_date_game" ON "game_results" USING btree ("game_date","game_id");--> statement-breakpoint
CREATE INDEX "idx_game_results_date_player" ON "game_results" USING btree ("game_date","player_id");
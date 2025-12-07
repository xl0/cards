CREATE TABLE `meaning_relation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`meaning_id_1` integer NOT NULL,
	`meaning_id_2` integer NOT NULL,
	`relation_type` text NOT NULL,
	FOREIGN KEY (`meaning_id_1`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meaning_id_2`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meaning_relation_unique` ON `meaning_relation` (`lang_pair`,`meaning_id_1`,`meaning_id_2`,`relation_type`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `translation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`src_meaning_id` integer NOT NULL,
	`dst_meaning_id` integer NOT NULL,
	FOREIGN KEY (`src_meaning_id`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dst_meaning_id`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_pair_unique` ON `translation` (`lang_pair`,`src_meaning_id`,`dst_meaning_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `word` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`text` text NOT NULL,
	`lang` text(2) NOT NULL,
	`pos` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `word_text_lang_pos` ON `word` (`lang_pair`,`text`,`lang`,`pos`);--> statement-breakpoint
CREATE TABLE `word_meaning` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`word_id` integer NOT NULL,
	`definition` text NOT NULL,
	`examples` text,
	FOREIGN KEY (`word_id`) REFERENCES `word`(`id`) ON UPDATE no action ON DELETE no action
);

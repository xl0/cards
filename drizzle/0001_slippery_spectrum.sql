PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_meaning_relation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`meaning_id_1` integer NOT NULL,
	`meaning_id_2` integer NOT NULL,
	`relation_type` text NOT NULL,
	FOREIGN KEY (`meaning_id_1`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`meaning_id_2`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_meaning_relation`("id", "lang_pair", "meaning_id_1", "meaning_id_2", "relation_type") SELECT "id", "lang_pair", "meaning_id_1", "meaning_id_2", "relation_type" FROM `meaning_relation`;--> statement-breakpoint
DROP TABLE `meaning_relation`;--> statement-breakpoint
ALTER TABLE `__new_meaning_relation` RENAME TO `meaning_relation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `meaning_relation_unique` ON `meaning_relation` (`lang_pair`,`meaning_id_1`,`meaning_id_2`,`relation_type`);--> statement-breakpoint
CREATE TABLE `__new_translation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`src_meaning_id` integer NOT NULL,
	`dst_meaning_id` integer NOT NULL,
	FOREIGN KEY (`src_meaning_id`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dst_meaning_id`) REFERENCES `word_meaning`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_translation`("id", "lang_pair", "src_meaning_id", "dst_meaning_id") SELECT "id", "lang_pair", "src_meaning_id", "dst_meaning_id" FROM `translation`;--> statement-breakpoint
DROP TABLE `translation`;--> statement-breakpoint
ALTER TABLE `__new_translation` RENAME TO `translation`;--> statement-breakpoint
CREATE UNIQUE INDEX `translation_pair_unique` ON `translation` (`lang_pair`,`src_meaning_id`,`dst_meaning_id`);--> statement-breakpoint
CREATE TABLE `__new_word_meaning` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_pair` text NOT NULL,
	`word_id` integer NOT NULL,
	`definition` text NOT NULL,
	`examples` text,
	FOREIGN KEY (`word_id`) REFERENCES `word`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_word_meaning`("id", "lang_pair", "word_id", "definition", "examples") SELECT "id", "lang_pair", "word_id", "definition", "examples" FROM `word_meaning`;--> statement-breakpoint
DROP TABLE `word_meaning`;--> statement-breakpoint
ALTER TABLE `__new_word_meaning` RENAME TO `word_meaning`;
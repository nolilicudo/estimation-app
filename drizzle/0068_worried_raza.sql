CREATE TABLE `dp_price_consult_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consult_type` varchar(32) NOT NULL,
	`section_key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`is_visible` tinyint NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `dp_price_consult_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dp_addition_options` ADD `cost_good` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `dp_addition_options` ADD `cost_better` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `dp_addition_options` ADD `cost_best` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `dp_addition_options` ADD `has_tiers` tinyint DEFAULT 0 NOT NULL;
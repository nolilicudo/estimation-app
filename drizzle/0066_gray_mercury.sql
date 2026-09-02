CREATE TABLE `dp_addition_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`markupPct` decimal(5,4) NOT NULL DEFAULT '0.4000',
	`repCommission` decimal(10,2) NOT NULL DEFAULT '1500.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_addition_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_addition_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` text,
	`pricing_type` enum('flat','per_sqft','per_unit','per_lf') NOT NULL DEFAULT 'flat',
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_addition_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_addition_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_basement_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`markupPct` decimal(5,4) NOT NULL DEFAULT '0.4000',
	`repCommission` decimal(10,2) NOT NULL DEFAULT '750.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_basement_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_basement_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` text,
	`pricing_type` enum('flat','per_sqft','per_unit','per_lf') NOT NULL DEFAULT 'flat',
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_basement_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_basement_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_kitchen_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`markupPct` decimal(5,4) NOT NULL DEFAULT '0.4000',
	`repCommission` decimal(10,2) NOT NULL DEFAULT '500.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_kitchen_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_kitchen_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(64) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` text,
	`pricing_type` enum('flat','per_sqft','per_unit','per_lf') NOT NULL DEFAULT 'flat',
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_kitchen_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_kitchen_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `dp_bathroom_electrical_options` ADD `pricingType` varchar(32) DEFAULT 'per_unit' NOT NULL;
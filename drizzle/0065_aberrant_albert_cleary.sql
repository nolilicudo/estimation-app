CREATE TABLE `dp_bathroom_accessories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`quantity_type` enum('none','count') NOT NULL DEFAULT 'none',
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_accessories_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_accessories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_fixture_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fixture_key` varchar(64) NOT NULL,
	`action_type` varchar(32) NOT NULL,
	`label` varchar(128) NOT NULL,
	`cost` decimal(10,2) NOT NULL DEFAULT '0',
	`cost_per_fixture` decimal(10,2) NOT NULL DEFAULT '0',
	`cost_note` varchar(256),
	`requires_checklist` tinyint NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_fixture_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_fixture_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fixture_key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`icon` varchar(32),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_fixture_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_floating_vanity_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turn_down_cost_per_linear_ft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`floating_mount_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_floating_vanity_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_painting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`label` varchar(120) NOT NULL,
	`description` text,
	`pricing_type` enum('per_sqft','flat','per_unit') NOT NULL DEFAULT 'per_sqft',
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_painting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dp_bathroom_tub_config` DROP COLUMN `size_label`;
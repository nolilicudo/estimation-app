CREATE TABLE `dp_bathroom_countertop` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_countertop_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_countertop_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_countertop_edge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`costPerLinearFt` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_countertop_edge_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_countertop_edge_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_flooring` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`tileSize` varchar(32),
	`tilePattern` varchar(64),
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_flooring_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_flooring_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_hvac_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_text` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_hvac_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_plumbing_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_text` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_plumbing_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_self_leveler` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cost_per_bag` decimal(10,2) NOT NULL DEFAULT '100.00',
	`sqft_per_bag_quarter_inch` int NOT NULL DEFAULT 50,
	`sqft_per_bag_half_inch` int NOT NULL DEFAULT 25,
	`sqft_per_bag_three_quarter_inch` int NOT NULL DEFAULT 12,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_self_leveler_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_shower_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_type` varchar(32) NOT NULL,
	`option_key` varchar(80) NOT NULL,
	`label` varchar(150) NOT NULL,
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`pricing_type` varchar(20) NOT NULL DEFAULT 'flat',
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_shower_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_shower_config_option_key_unique` UNIQUE(`option_key`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_shower_surround` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`tileSize` varchar(32),
	`tilePattern` varchar(64),
	`flatCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_shower_surround_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_shower_surround_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_tile_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pattern_key` varchar(80) NOT NULL,
	`label` varchar(100) NOT NULL,
	`upcharge_per_sqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_tile_patterns_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_tile_patterns_pattern_key_unique` UNIQUE(`pattern_key`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_tile_sizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`size_key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`floor_cost_per_sqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`wall_cost_per_sqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`ceiling_cost_per_sqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_tile_sizes_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_tile_sizes_size_key_unique` UNIQUE(`size_key`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_toilet` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`flatCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_toilet_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_toilet_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_tub_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tub_type` varchar(32) NOT NULL,
	`label` varchar(128) NOT NULL,
	`size_label` varchar(64),
	`install_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_tub_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_vanity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`sizeInches` int,
	`costPerLinearFt` decimal(10,2) NOT NULL DEFAULT '0.00',
	`flatCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_vanity_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_vanity_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_vanity_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`width_inches` int NOT NULL,
	`material` varchar(50) NOT NULL,
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_vanity_pricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_vanity_width_material` UNIQUE(`width_inches`,`material`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_vanity_support` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cost_per_support` decimal(10,2) NOT NULL DEFAULT '175.00',
	`spacing_inches` int NOT NULL DEFAULT 16,
	`min_supports` int NOT NULL DEFAULT 2,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_vanity_support_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_wall_finish` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`type` varchar(32) NOT NULL,
	`tileSize` varchar(32),
	`tilePattern` varchar(64),
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_wall_finish_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_wall_finish_slug_unique` UNIQUE(`slug`)
);

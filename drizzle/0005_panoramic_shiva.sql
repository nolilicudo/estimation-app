CREATE TABLE `duradek_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`series` varchar(128) NOT NULL,
	`hex` varchar(7) NOT NULL,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `duradek_colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `duradek_colors_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productType` varchar(64) NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` text NOT NULL,
	`label` varchar(256) NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resin_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`hex` varchar(7) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'primary',
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resin_colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `resin_colors_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `resin_surfaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`requiresWaterproofing` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resin_surfaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `resin_surfaces_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tile_sizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`laborPerSqft` decimal(10,2) NOT NULL,
	`materialPerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tile_sizes_id` PRIMARY KEY(`id`),
	CONSTRAINT `tile_sizes_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `waterproofing_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waterproofing_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `waterproofing_options_slug_unique` UNIQUE(`slug`)
);

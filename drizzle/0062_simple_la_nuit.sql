CREATE TABLE `dp_bathroom_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_addons_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_addons_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`markupPct` decimal(5,4) NOT NULL DEFAULT '0.4000',
	`repCommission` decimal(10,2) NOT NULL DEFAULT '500.00',
	`dpArchEngineeringCost` decimal(10,2) NOT NULL DEFAULT '800.00',
	`dp3dRenderingsCost` decimal(10,2) NOT NULL DEFAULT '400.00',
	`dpPlumbingSchematicCost` decimal(10,2) NOT NULL DEFAULT '200.00',
	`dpElectricalSchematicCost` decimal(10,2) NOT NULL DEFAULT '200.00',
	`dpMaterialSelectionsCost` decimal(10,2) NOT NULL DEFAULT '300.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_electrical_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_electrical_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_electrical_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_finish_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_finish_tiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_finish_tiers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_hvac_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_hvac_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_hvac_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_plumbing_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`cost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_plumbing_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_plumbing_items_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `dp_bathroom_size_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(500),
	`sqftRange` varchar(64),
	`baseCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`costPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_bathroom_size_tiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `dp_bathroom_size_tiers_slug_unique` UNIQUE(`slug`)
);

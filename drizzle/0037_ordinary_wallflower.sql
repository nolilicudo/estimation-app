CREATE TABLE `frost_footing_formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`value` varchar(256) NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frost_footing_formulas_id` PRIMARY KEY(`id`),
	CONSTRAINT `frost_footing_formulas_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `frost_footing_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diameterIn` int NOT NULL,
	`label` varchar(64) NOT NULL,
	`costPerUnit` decimal(10,2) NOT NULL DEFAULT '0.00',
	`marginPct` decimal(5,2) NOT NULL DEFAULT '35.00',
	`pricePerUnit` decimal(10,2) NOT NULL DEFAULT '0.00',
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frost_footing_pricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `frost_footing_pricing_diameterIn_unique` UNIQUE(`diameterIn`)
);
--> statement-breakpoint
CREATE TABLE `frost_footing_sizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`joistLengthFt` int NOT NULL,
	`postSpacingFt` int NOT NULL,
	`footingType` varchar(32) NOT NULL,
	`diameterIn1` int NOT NULL,
	`diameterIn2` int NOT NULL,
	`diameterIn3` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `frost_footing_sizes_id` PRIMARY KEY(`id`)
);

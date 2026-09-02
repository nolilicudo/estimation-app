CREATE TABLE `rain_escape_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`gutterPricePerLinearFt` decimal(10,2) NOT NULL DEFAULT '0.00',
	`systemPricePerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`laborPricePerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rain_escape_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `rain_escape_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `soffit_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`laborPricePerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `soffit_materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `soffit_materials_slug_unique` UNIQUE(`slug`)
);

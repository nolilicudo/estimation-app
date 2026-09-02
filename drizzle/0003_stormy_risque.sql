CREATE TABLE `concrete_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`unit` varchar(32) NOT NULL DEFAULT 'sqft',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concrete_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `concrete_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `demolition_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demolition_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `demolition_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `facade_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facade_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `facade_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `footing_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`unit` varchar(32) NOT NULL DEFAULT 'each',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `footing_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `footing_options_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `framing_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerSqft` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `framing_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `framing_options_slug_unique` UNIQUE(`slug`)
);

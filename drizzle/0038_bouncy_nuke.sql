CREATE TABLE `steel_jacket_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`materialCostPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`installCostPerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`marginPct` decimal(5,2) NOT NULL DEFAULT '35.00',
	`pricePerSqft` decimal(10,2) NOT NULL DEFAULT '0.00',
	`photoUrls` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `steel_jacket_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `steel_jacket_options_slug_unique` UNIQUE(`slug`)
);

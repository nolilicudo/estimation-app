CREATE TABLE `labor_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tierId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`unit` varchar(32) NOT NULL DEFAULT 'flat',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labor_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `labor_tiers` ADD `minimumPrice` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `labor_tiers` ADD `collectionSlug` varchar(64);
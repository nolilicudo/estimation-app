CREATE TABLE `corners_waste_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corners` int NOT NULL,
	`allNinetyDegrees` int NOT NULL DEFAULT 1,
	`wastePercent` decimal(5,2) NOT NULL DEFAULT '10.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corners_waste_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lumber_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` varchar(512),
	`unit` varchar(32) NOT NULL DEFAULT 'each',
	`costPrice` decimal(10,2) NOT NULL DEFAULT '0.00',
	`markupMultiplier` decimal(5,3) NOT NULL DEFAULT '1.300',
	`displayPrice` decimal(10,2) NOT NULL DEFAULT '0.00',
	`category` varchar(64) NOT NULL DEFAULT 'joist',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lumber_items_id` PRIMARY KEY(`id`)
);

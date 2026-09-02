CREATE TABLE `design_package_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(500) DEFAULT '',
	`pricingType` varchar(20) NOT NULL DEFAULT 'flat',
	`costPerSqft` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`flatCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`markupPct` decimal(5,2) NOT NULL DEFAULT '50.00',
	`projectTypes` varchar(255) NOT NULL DEFAULT 'all',
	`renderingType` varchar(50) DEFAULT null,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_package_items_id` PRIMARY KEY(`id`)
);

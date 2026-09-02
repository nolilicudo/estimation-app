CREATE TABLE `dp_catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeSheet` varchar(64) NOT NULL,
	`category` varchar(128),
	`name` varchar(255) NOT NULL,
	`unit` varchar(32) NOT NULL DEFAULT 'each',
	`laborCost` decimal(12,2) DEFAULT '0.00',
	`materialCost` decimal(12,2) DEFAULT '0.00',
	`marginPct` decimal(5,2) DEFAULT '37.50',
	`estimatedPrice` decimal(12,2) DEFAULT '0.00',
	`minimumPrice` decimal(12,2) DEFAULT '0.00',
	`productLink` text,
	`electricalContext` varchar(32),
	`defaultQtyFormula` text,
	`notes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_catalog_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_pricing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`catalogItemId` int NOT NULL,
	`conditions` json NOT NULL DEFAULT ('[]'),
	`quantity` varchar(128) NOT NULL DEFAULT '1',
	`tradeSection` varchar(128) NOT NULL DEFAULT 'General',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_pricing_rules_id` PRIMARY KEY(`id`)
);

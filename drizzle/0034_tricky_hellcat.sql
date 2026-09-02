CREATE TABLE `lumber_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lumberItemId` int NOT NULL,
	`lumberItemName` varchar(128) NOT NULL,
	`sku` varchar(32) NOT NULL,
	`oldCostPrice` decimal(10,2) NOT NULL,
	`newCostPrice` decimal(10,2) NOT NULL,
	`oldDisplayPrice` decimal(10,2) NOT NULL,
	`newDisplayPrice` decimal(10,2) NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`source` varchar(32) NOT NULL DEFAULT 'scheduled',
	CONSTRAINT `lumber_price_history_id` PRIMARY KEY(`id`)
);

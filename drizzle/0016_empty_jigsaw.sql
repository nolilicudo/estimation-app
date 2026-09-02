CREATE TABLE `railing_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`railingType` varchar(32) NOT NULL DEFAULT 'wire',
	`orientation` varchar(32),
	`description` varchar(512),
	`pricePerLf` decimal(8,2) NOT NULL DEFAULT '0.00',
	`costPerLf` decimal(8,2) NOT NULL DEFAULT '0.00',
	`marginPct` decimal(5,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `railing_options_id` PRIMARY KEY(`id`)
);

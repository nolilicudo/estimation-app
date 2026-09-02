CREATE TABLE `spiral_stair_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diameter` int NOT NULL,
	`treadMaterial` varchar(64) NOT NULL,
	`costPrice` decimal(10,2) NOT NULL DEFAULT '0.00',
	`marginPct` decimal(5,2) NOT NULL DEFAULT '35.00',
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spiral_stair_pricing_id` PRIMARY KEY(`id`)
);

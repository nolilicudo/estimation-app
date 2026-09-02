CREATE TABLE `install_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(256) NOT NULL,
	`startDate` varchar(16) NOT NULL,
	`endDate` varchar(16) NOT NULL,
	`isAvailable` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `install_slots_id` PRIMARY KEY(`id`)
);

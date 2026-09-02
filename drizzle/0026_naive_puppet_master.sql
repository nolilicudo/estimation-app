CREATE TABLE `project_detail_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_detail_options_id` PRIMARY KEY(`id`)
);

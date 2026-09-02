CREATE TABLE `glulam_beam_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`widthIn` decimal(5,3) NOT NULL,
	`depthIn` decimal(5,2) NOT NULL,
	`spanFt` int NOT NULL,
	`maxPlfFloor` int NOT NULL,
	`maxPlfSnow` int NOT NULL DEFAULT 0,
	`species` varchar(32) NOT NULL DEFAULT '24F-V4',
	`notes` varchar(256),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `glulam_beam_entries_id` PRIMARY KEY(`id`)
);

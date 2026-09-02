CREATE TABLE `post_wrap_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`pricePerLf` decimal(10,2) NOT NULL DEFAULT '0.00',
	`laborPricePerLf` decimal(10,2) NOT NULL DEFAULT '0.00',
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_wrap_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_wrap_options_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `post_wrap_length_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postWrapOptionId` int NOT NULL,
	`lengthFt` int NOT NULL,
	`materialCostPerPiece` decimal(10,2) NOT NULL DEFAULT '0.00',
	`materialPricePerPiece` decimal(10,2) NOT NULL DEFAULT '0.00',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_wrap_length_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `post_wrap_options` ADD `laborPricePerPost` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `post_wrap_options` ADD `laborPricePerBeamLf` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `post_wrap_length_tiers` ADD CONSTRAINT `post_wrap_length_tiers_postWrapOptionId_post_wrap_options_id_fk` FOREIGN KEY (`postWrapOptionId`) REFERENCES `post_wrap_options`(`id`) ON DELETE cascade ON UPDATE no action;
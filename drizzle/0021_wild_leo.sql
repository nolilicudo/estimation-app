ALTER TABLE `lumber_items` ADD `homeDepotSku` varchar(32);--> statement-breakpoint
ALTER TABLE `lumber_items` ADD `lastSyncedPrice` decimal(10,2);--> statement-breakpoint
ALTER TABLE `lumber_items` ADD `lastSyncedAt` timestamp;
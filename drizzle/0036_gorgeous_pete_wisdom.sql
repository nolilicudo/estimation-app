ALTER TABLE `sign_requests` ADD `discountApplied` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `discountName` varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `discountValue` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `discount2Applied` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `discount2Name` varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `discount2Value` decimal(10,2) DEFAULT '0.00' NOT NULL;
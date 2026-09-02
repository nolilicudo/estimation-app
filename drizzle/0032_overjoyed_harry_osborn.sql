ALTER TABLE `calculator_users` ADD `title` varchar(128);--> statement-breakpoint
ALTER TABLE `calculator_users` ADD `companyPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `calculator_users` ADD `role` varchar(32) DEFAULT 'rep' NOT NULL;--> statement-breakpoint
ALTER TABLE `calculator_users` ADD `managerId` int;--> statement-breakpoint
ALTER TABLE `calculator_users` ADD `permissions` json;--> statement-breakpoint
ALTER TABLE `sent_emails` ADD `assignedUserId` int;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `assignedUserId` int;
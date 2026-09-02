ALTER TABLE `dp_feasibility_config` ADD `name` varchar(255) DEFAULT 'Feasibility Study' NOT NULL;--> statement-breakpoint
ALTER TABLE `dp_feasibility_config` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dp_feasibility_config` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `sent_emails` ADD `jobtreadJobId` varchar(128);
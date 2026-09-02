ALTER TABLE `sign_requests` ADD `reminderCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `lastReminderAt` timestamp;
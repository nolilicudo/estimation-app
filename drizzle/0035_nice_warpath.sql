ALTER TABLE `sign_requests` ADD `projectStatus` varchar(32) DEFAULT 'estimate-sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `projectNotes` text;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `projectPhotos` json;--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `materialSnapshot` json;
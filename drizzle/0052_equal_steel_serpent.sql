CREATE TABLE `rough_inspiration_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeKey` varchar(50) NOT NULL DEFAULT 'general',
	`photoUrl` varchar(1000) NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT '',
	`subtitle` varchar(500) NOT NULL DEFAULT '',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rough_inspiration_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rough_questionnaire_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`roomKey` varchar(50) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rough_questionnaire_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rough_questionnaire_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(255) NOT NULL,
	`customerPhone` varchar(50) NOT NULL,
	`customerAddress` varchar(500),
	`mode` varchar(20),
	`status` varchar(30) NOT NULL DEFAULT 'sent',
	`notes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rough_questionnaire_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rough_questionnaire_submissions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `rough_questionnaire_trade_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`tradeKey` varchar(50) NOT NULL,
	`selectedPhotoIds` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rough_questionnaire_trade_selections_id` PRIMARY KEY(`id`)
);

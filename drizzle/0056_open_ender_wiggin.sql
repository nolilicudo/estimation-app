CREATE TABLE `questionnaire_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOptionIds` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionnaire_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`text` varchar(255) NOT NULL,
	`subtext` text,
	`imageUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`priceAdjustment` decimal(12,2) DEFAULT '0',
	`priceAdjustmentType` enum('flat','percent','none') NOT NULL DEFAULT 'none',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_price_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`baseMin` decimal(12,2) NOT NULL,
	`baseMax` decimal(12,2) NOT NULL,
	`conditions` json DEFAULT ('[]'),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_price_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`text` text NOT NULL,
	`subtext` text,
	`type` enum('single','multi') NOT NULL DEFAULT 'single',
	`imageUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`parentQuestionId` int,
	`parentOptionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(64) NOT NULL,
	`customerName` varchar(255),
	`customerPhone` varchar(30),
	`customerEmail` varchar(320),
	`salesRepName` varchar(255),
	`notes` text,
	`estimatedMin` decimal(12,2),
	`estimatedMax` decimal(12,2),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `questionnaire_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);

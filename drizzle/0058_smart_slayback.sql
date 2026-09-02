CREATE TABLE `questionnaire_pricing_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`optionId` int,
	`label` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_pricing_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_pricing_tier_multipliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionKey` varchar(64) NOT NULL,
	`sectionLabel` varchar(128) NOT NULL,
	`tier` int NOT NULL,
	`multiplier` decimal(6,4) NOT NULL DEFAULT '1.0000',
	`tierLabel` varchar(128) NOT NULL DEFAULT '',
	`weight` decimal(5,4) NOT NULL DEFAULT '1.0000',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionnaire_pricing_tier_multipliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questionnaire_questions` MODIFY COLUMN `type` enum('single','multi','quantity_select','voice_photo','photo_upload') NOT NULL DEFAULT 'single';--> statement-breakpoint
ALTER TABLE `questionnaire_answers` ADD `freeformValue` text;--> statement-breakpoint
ALTER TABLE `questionnaire_answers` ADD `photoCategory` varchar(128);--> statement-breakpoint
ALTER TABLE `questionnaire_options` ADD `pricingTier` int;--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `inputType` varchar(32) DEFAULT 'options' NOT NULL;--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `dropdownOptions` json;--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `calculationRules` json;--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `tradeCategory` varchar(128);--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `displayOrder` decimal(10,2);--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `section` varchar(64);--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `questionnaireSessionId` int;
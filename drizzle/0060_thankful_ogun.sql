CREATE TABLE `dp_cabinet_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor` varchar(100) NOT NULL,
	`collection` varchar(100),
	`style` varchar(100) NOT NULL,
	`color` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`option_label` varchar(200) NOT NULL,
	`line_item_type` enum('base','upper','pantry') NOT NULL,
	`unit` varchar(10) NOT NULL DEFAULT 'LF',
	`msrp_unit_price` decimal(10,4) NOT NULL DEFAULT '0',
	`discounted_unit_price` decimal(10,4) NOT NULL DEFAULT '0',
	`margin_pct` decimal(5,2) NOT NULL DEFAULT '0',
	`estimated_price` decimal(10,2) NOT NULL DEFAULT '0',
	`notes` text,
	`is_active` int NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `dp_cabinet_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaire_session_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL DEFAULT 0,
	`mimeType` varchar(128) NOT NULL DEFAULT 'application/octet-stream',
	`fileCategory` varchar(64) NOT NULL DEFAULT 'other',
	`questionLabel` varchar(255),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionnaire_session_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questionnaire_questions` MODIFY COLUMN `type` enum('single','multi','quantity_select','voice_photo','photo_upload','number','text') NOT NULL DEFAULT 'single';--> statement-breakpoint
ALTER TABLE `questionnaire_questions` ADD `applicableProjectTypes` json;--> statement-breakpoint
ALTER TABLE `questionnaire_sessions` ADD `knowledgePath` enum('help_me_figure_out','i_know_what_i_want','i_have_plans');--> statement-breakpoint
ALTER TABLE `questionnaire_sessions` ADD `projectType` varchar(32);
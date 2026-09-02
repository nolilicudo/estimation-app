CREATE TABLE `dp_free_features` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(500) DEFAULT '',
	`photoUrl` varchar(1024) DEFAULT '',
	`listPrice` decimal(10,2) NOT NULL DEFAULT '0.00',
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_free_features_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dp_questionnaire_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(500) NOT NULL,
	`questionType` varchar(32) NOT NULL DEFAULT 'single_choice',
	`options` text DEFAULT ('[]'),
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_questionnaire_questions_id` PRIMARY KEY(`id`)
);

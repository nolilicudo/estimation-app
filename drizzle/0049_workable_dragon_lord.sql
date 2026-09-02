CREATE TABLE `dp_project_type_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectType` varchar(64) NOT NULL,
	`sectionKey` varchar(64) NOT NULL,
	`sectionLabel` varchar(255) NOT NULL,
	`isEnabled` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_project_type_sections_id` PRIMARY KEY(`id`)
);

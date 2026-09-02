CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`serviceType` varchar(64) NOT NULL,
	`contractText` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `contract_templates_serviceType_unique` UNIQUE(`serviceType`)
);
--> statement-breakpoint
CREATE TABLE `sent_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(256) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(64),
	`customerAddress` varchar(512),
	`customerCity` varchar(128),
	`emailType` varchar(32) NOT NULL,
	`subject` varchar(512),
	`signRequestId` int,
	`signRequestToken` varchar(64),
	`estimateSnapshot` text,
	`collectionName` varchar(128),
	`colorName` varchar(128),
	`sqft` int DEFAULT 0,
	`finalTotal` decimal(10,2),
	`ghlContactId` varchar(128),
	`ghlOpportunityId` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sent_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sign_requests` ADD `customerCity` varchar(128);
CREATE TABLE `design_package_commission` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectType` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`commissionAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_package_commission_id` PRIMARY KEY(`id`),
	CONSTRAINT `design_package_commission_projectType_unique` UNIQUE(`projectType`)
);

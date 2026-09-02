CREATE TABLE `design_package_discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discountType` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`discountPct` decimal(5,2) NOT NULL DEFAULT '0.00',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_package_discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `design_package_discounts_discountType_unique` UNIQUE(`discountType`)
);

CREATE TABLE `dp_engineer_letter_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`price` decimal(10,2) NOT NULL DEFAULT '500.00',
	`internalCost` decimal(10,2) NOT NULL DEFAULT '250.00',
	`description` varchar(1000) NOT NULL DEFAULT 'A stamped letter from a licensed structural engineer confirming the design meets local building code requirements. Required by some municipalities for permit approval.',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_engineer_letter_config_id` PRIMARY KEY(`id`)
);

CREATE TABLE `dp_feasibility_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`price` decimal(10,2) NOT NULL DEFAULT '1000.00',
	`repCommission` decimal(10,2) NOT NULL DEFAULT '250.00',
	`drafterCost` decimal(10,2) NOT NULL DEFAULT '500.00',
	`description` varchar(1000) NOT NULL DEFAULT 'A feasibility study determines if your addition is structurally and legally viable before committing to a full design package. Includes a site visit, preliminary drawings, and a written report.',
	`tags` varchar(500) NOT NULL DEFAULT 'Zoning Review,Structural Assessment,Preliminary Drawings,Cost Validation',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dp_feasibility_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `design_package_items` ADD `subtitle` varchar(500) DEFAULT '';--> statement-breakpoint
ALTER TABLE `dp_free_features` ADD `projectTypes` varchar(255) DEFAULT 'all' NOT NULL;
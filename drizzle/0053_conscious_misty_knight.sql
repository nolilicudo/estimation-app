ALTER TABLE `contract_templates` DROP INDEX `contract_templates_serviceType_unique`;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `projectType` varchar(64) DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD CONSTRAINT `serviceType_projectType_unique` UNIQUE(`serviceType`,`projectType`);
ALTER TABLE `soffit_materials` MODIFY COLUMN `pricePerSqft` decimal(10,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `facade_options` ADD `installCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `railing_options` ADD `installCostPerLf` decimal(8,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `rain_escape_options` ADD `gutterMaterialCostPerLf` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `rain_escape_options` ADD `gutterInstallCostPerLf` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `rain_escape_options` ADD `systemMaterialCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `rain_escape_options` ADD `systemInstallCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `rain_escape_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `soffit_materials` ADD `materialCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `soffit_materials` ADD `installCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `soffit_materials` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;
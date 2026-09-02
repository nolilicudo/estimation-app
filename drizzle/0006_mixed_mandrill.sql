ALTER TABLE `labor_tiers` ADD `laborCostPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `labor_tiers` ADD `marginPercent` decimal(5,2) DEFAULT '0.00' NOT NULL;
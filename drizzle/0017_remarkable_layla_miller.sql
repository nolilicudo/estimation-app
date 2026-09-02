ALTER TABLE `accessories` ADD `costPerUnit` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `accessories` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `concrete_options` ADD `costPerUnit` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `concrete_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `demolition_options` ADD `costPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `demolition_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `edge_options` ADD `costPerLinearFt` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `edge_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `facade_options` ADD `costPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `facade_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `footing_options` ADD `costPerUnit` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `footing_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `framing_options` ADD `costPerSqft` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `framing_options` ADD `marginPct` decimal(5,2) DEFAULT '35.00' NOT NULL;
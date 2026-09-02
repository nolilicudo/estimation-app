ALTER TABLE `colors` ADD CONSTRAINT `colors_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `delivery_options` ADD CONSTRAINT `delivery_options_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `edge_options` ADD CONSTRAINT `edge_options_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `labor_tiers` ADD CONSTRAINT `labor_tiers_slug_unique` UNIQUE(`slug`);
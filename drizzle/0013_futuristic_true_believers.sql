CREATE TABLE `hot_tub_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`persons` int NOT NULL,
	`weightLb` int NOT NULL,
	`footprintSqft` decimal(6,2) NOT NULL,
	`psf` decimal(6,2) NOT NULL,
	`loadFactor` decimal(4,2) NOT NULL DEFAULT '1.50',
	`notes` varchar(256),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hot_tub_weights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `joist_span_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`joistSize` varchar(16) NOT NULL,
	`spacingIn` int NOT NULL DEFAULT 16,
	`maxSpanFt` decimal(5,2) NOT NULL,
	`loadFactorMin` decimal(5,2) NOT NULL DEFAULT '0.00',
	`loadFactorMax` decimal(5,2) NOT NULL DEFAULT '9999.00',
	`notes` varchar(256),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `joist_span_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lvl_beam_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maxPostSpacingFt` decimal(5,2) NOT NULL,
	`maxPlf` decimal(8,2) NOT NULL,
	`beamSize` varchar(32) NOT NULL,
	`isDouble` int NOT NULL DEFAULT 0,
	`notes` varchar(256),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lvl_beam_entries_id` PRIMARY KEY(`id`)
);

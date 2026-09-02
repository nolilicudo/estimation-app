CREATE TABLE `initial_consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`consultant_user_id` int,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`input_data` text,
	`result_data` text,
	`client_name` varchar(128),
	`client_email` varchar(256),
	`client_phone` varchar(32),
	`property_address` varchar(512),
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `initial_consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mortgage_rate_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rate` decimal(6,4) NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'Freddie Mac PMMS',
	`effective_date` varchar(32) NOT NULL,
	`retrieved_at` bigint NOT NULL DEFAULT 0,
	`is_fallback` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `mortgage_rate_cache_id` PRIMARY KEY(`id`)
);

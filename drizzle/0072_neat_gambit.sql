CREATE TABLE `estimate_site_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_key` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`s3_key` varchar(512) NOT NULL,
	`caption` varchar(512) DEFAULT '',
	`category` varchar(64) DEFAULT 'site',
	`mime_type` varchar(64) DEFAULT 'image/jpeg',
	`file_size_bytes` int DEFAULT 0,
	`sign_request_id` int,
	`uploaded_by` int,
	`created_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `estimate_site_photos_id` PRIMARY KEY(`id`)
);

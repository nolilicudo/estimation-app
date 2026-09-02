ALTER TABLE `questionnaire_questions` MODIFY COLUMN `type` enum('single','multi','quantity_select','voice_photo') NOT NULL DEFAULT 'single';--> statement-breakpoint
ALTER TABLE `questionnaire_answers` ADD `quantities` json;--> statement-breakpoint
ALTER TABLE `questionnaire_answers` ADD `voiceTranscription` text;--> statement-breakpoint
ALTER TABLE `questionnaire_answers` ADD `photoUrls` json;
CREATE TABLE `brochure_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(64),
	`sentToZapier` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brochure_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(256) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(64),
	`customerAddress` varchar(512),
	`estimateSnapshot` text NOT NULL,
	`productType` varchar(64) NOT NULL DEFAULT 'tanzite',
	`collectionName` varchar(128),
	`sqft` int NOT NULL DEFAULT 0,
	`grandTotal` decimal(10,2) NOT NULL,
	`depositAmount` decimal(10,2) NOT NULL,
	`balanceAmount` decimal(10,2) NOT NULL,
	`signedName` varchar(256),
	`signedAt` timestamp,
	`contractText` text,
	`stripeDepositSessionId` varchar(256),
	`stripeBalanceSessionId` varchar(256),
	`stripeDepositPaymentIntentId` varchar(256),
	`stripeBalancePaymentIntentId` varchar(256),
	`paymentStatus` varchar(32) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);

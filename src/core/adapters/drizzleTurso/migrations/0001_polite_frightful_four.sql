ALTER TABLE `locations` ADD `category` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `contact_info` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `operating_hours` text;--> statement-breakpoint
ALTER TABLE `regions` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `regions` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_subscription_id` text;
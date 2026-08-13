DROP INDEX "idx_milkman_customer_pricing";--> statement-breakpoint
ALTER TABLE "customer_pricings" ADD COLUMN "product_name" varchar;--> statement-breakpoint
CREATE INDEX "idx_milkman_customer_pricing" ON "customer_pricings" USING btree ("milkman_id","customer_id","product_name");
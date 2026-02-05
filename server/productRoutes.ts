import { Router } from "express";
import { db } from "./db";
import { products, milkmen, type Product, type Milkman } from "@shared/schema";
import { eq, and, like, lte } from "drizzle-orm";

const router = Router();

// GET /api/products
router.get("/", async (req, res) => {
    try {
        const { search, category, maxPrice, milkmanId } = req.query;

        // Start building the query
        let query = db
            .select({
                product: products,
                milkman: milkmen,
            })
            .from(products)
            .innerJoin(milkmen, eq(products.milkmanId, milkmen.id))
            .where(eq(products.isAvailable, true));

        // Apply filters
        // Note: For now we're fetching all and letting frontend filter some aspects,
        // but we can add server-side filtering here.

        // Simple server-side validation/filtering if needed
        if (milkmanId) {
            // If filtered by milkman
            // query = query.where(eq(products.milkmanId, parseInt(milkmanId as string)));
        }

        const results = await query;

        // Transform data to match frontend expectations
        const enrichedProducts = results.map(({ product, milkman }) => ({
            ...product,
            milkmanName: milkman.businessName,
            milkmanContact: milkman.contactName,
            milkmanPhone: milkman.phone,
            milkmanAddress: milkman.address,
            milkmanRating: milkman.rating,
            deliveryTime: `${milkman.deliveryTimeStart} - ${milkman.deliveryTimeEnd}`,
            // Ensure numeric conversions if needed, though schema types should handle it
            price: parseFloat(product.price as unknown as string),
        }));

        res.json(enrichedProducts);
    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

/**
 * One rule for whether a dairy item is on sale.
 *
 * A product created at profile setup has no `isAvailable` key at all. The
 * customer screens read that as available (`!== false`); the milkman's own
 * inventory screen read plain truthiness, so the same product appeared switched
 * off to him and switched on to everyone else — with an "Activate" button under
 * it. Tapping that twice, which is what anyone does when a control seems not to
 * have worked, wrote `false` and removed the product from every customer's
 * order screen silently.
 *
 * Absent means available. That is the only reading that matches what a milkman
 * sees when he adds a product and does nothing else.
 */
export function isProductAvailable(item: { isAvailable?: boolean } | null | undefined): boolean {
    return !!item && item.isAvailable !== false;
}

/** The items a customer may actually order right now. */
export function availableProducts<T extends { isAvailable?: boolean }>(items: T[] | null | undefined): T[] {
    return (items || []).filter(isProductAvailable);
}

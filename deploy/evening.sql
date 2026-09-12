-- End-of-day money position, per dairyman.
--
-- Direction depends on who took the cash, and it is not the same both ways:
--
--   COD    — the customer hands notes to the dairyman. He is holding the whole
--            amount including your 1% fee, so HE OWES YOU fee + commission.
--   Online — Razorpay settles into the platform account. YOU OWE HIM the
--            subtotal minus commission.
--
-- Reporting a single "payout" figure would be wrong in both directions, so the
-- two are kept apart and netted only at the end.
--
-- A bill whose payment row cannot be matched is counted as 'unknown' rather
-- than guessed at: the Razorpay webhook records the gateway's order id, not
-- BILL_<id>, so that link is genuinely missing and must be visible, not
-- silently folded into one side.
WITH paid_today AS (
    SELECT
        b.id,
        b.milkman_id,
        COALESCE(b.subtotal, 0)                  AS subtotal,
        COALESCE(b.customer_fee_amount, 0)       AS fee,
        COALESCE(b.vendor_commission_amount, 0)  AS commission,
        COALESCE(
            (SELECT p.payment_method FROM payments p
              WHERE p.order_id = 'BILL_' || b.id
                AND p.status = 'completed'
              ORDER BY p.id DESC LIMIT 1),
            'unknown'
        ) AS method
    FROM bills b
    WHERE b.status = 'paid'
      AND (b.paid_at AT TIME ZONE 'Asia/Kolkata')::date
          = (now() AT TIME ZONE 'Asia/Kolkata')::date
)
SELECT
    COALESCE(m.business_name, 'dairyman #' || t.milkman_id) AS who,
    COUNT(*)                                                 AS bills,
    ROUND(SUM(t.fee + t.commission), 2)                      AS you_earned,
    ROUND(SUM(CASE WHEN t.method = 'cod'
                   THEN t.fee + t.commission ELSE 0 END), 2) AS he_owes_you,
    ROUND(SUM(CASE WHEN t.method NOT IN ('cod', 'unknown')
                   THEN t.subtotal - t.commission ELSE 0 END), 2) AS you_owe_him,
    SUM(CASE WHEN t.method = 'unknown' THEN 1 ELSE 0 END)    AS unmatched
FROM paid_today t
LEFT JOIN milkmen m ON m.id = t.milkman_id
GROUP BY t.milkman_id, m.business_name
ORDER BY you_earned DESC;

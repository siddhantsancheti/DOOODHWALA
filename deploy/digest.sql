-- One row of numbers for the daily digest. Pipe-separated, no headers.
--
-- Every date comparison is shifted into Asia/Kolkata explicitly. Supabase runs
-- in UTC, so a bare current_date rolls over at 05:30 IST and would report the
-- wrong day's deliveries for the five and a half hours that matter most —
-- exactly the round the digest is meant to summarise.
SELECT
    (SELECT count(*) FROM users WHERE user_type IS NULL),

    (SELECT count(*) FROM users u
      WHERE u.user_type = 'milkman'
        AND NOT EXISTS (SELECT 1 FROM milkmen m WHERE m.user_id = u.id)),

    (SELECT count(*) FROM customers c
      WHERE NOT EXISTS (SELECT 1 FROM customer_milkmen cm WHERE cm.customer_id = c.id)),

    (SELECT count(*) FROM milkmen WHERE verification_status = 'pending'),

    (SELECT count(*) FROM orders
      WHERE status = 'delivered'
        AND (delivered_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date - 1),

    (SELECT count(*) FROM orders
      WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date
            = (now() AT TIME ZONE 'Asia/Kolkata')::date - 1),

    (SELECT count(*) FROM bills
      WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Kolkata')
            = date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')),

    -- Lifetime platform revenue, read from the amounts snapshotted onto each
    -- bill rather than recomputed from a rate that may have changed since.
    (SELECT round(coalesce(sum(coalesce(customer_fee_amount, 0)
                             + coalesce(vendor_commission_amount, 0)), 0), 2)
       FROM bills);

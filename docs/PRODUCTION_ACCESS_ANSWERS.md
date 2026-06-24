# DOOODHWALA — Production access questionnaire (draft answers)

Google asks these when you click "Apply for production" (after the 14-day closed
test). Tailor to what actually happened, but these are ready to paste/adapt.

---

**Q: How did you find testers for your closed test?**
> Our testers are people we know personally — friends, family, classmates and a
> few local dairy customers in our area who are part of our target audience for a
> daily milk-delivery app. We shared the Play opt-in link directly with each of
> them and asked them to install the app and use the core flows.

**Q: What did your testers do / how did they engage?**
> Testers signed in with phone OTP, browsed and selected a dairyman, placed daily
> milk orders through the in-app chat, set up auto-send/subscriptions, tracked a
> delivery on the map, viewed and paid monthly bills (UPI and Cash on Delivery),
> downloaded bill/receipt PDFs, used the household-group feature, and chatted with
> their dairyman including sharing photos. A few testers also used the dairyman
> side to accept orders, generate bills and accept payments.

**Q: What feedback did you receive, and what did you change?**
> Key feedback and the fixes we shipped during testing:
> - Login: some testers hit a "code expired" error on Android — we fixed the
>   OTP auto-verification handling so sign-in is reliable.
> - Payments: testers wanted instant confirmation — we made bill payment update
>   in real time and added a webhook fallback so a payment is never lost.
> - Billing: a duplicate-bill issue was reported and fixed so an order is billed
>   only once.
> - Usability: editable daily-order time, working PDF bill/receipt downloads,
>   and a shared-media view in chat were added based on tester requests.
> - We also tightened security (COD OTP verification, scoped real-time events).

**Q: How confident are you that the app is ready for production?**
> Confident. The core journeys (sign-up, ordering, delivery tracking, billing and
> payments) were exercised by our testers over the test period, issues raised were
> fixed and re-tested, and the app has a complete store listing, privacy policy,
> data-safety declaration and in-app account deletion. Payments are processed
> securely via Razorpay and Cash-on-Delivery with OTP confirmation.

**Q: Anything else about your app / testing?**
> DOOODHWALA connects customers with local milk-delivery vendors for daily dairy
> ordering, delivery tracking and monthly billing. Our closed test focused on a
> small group of real users in our launch area to validate the end-to-end flow
> before opening to the public.

---

## Tips
- Keep answers honest and specific to your real testers/feedback.
- Mention concrete bugs you found + fixed (shows genuine testing) — the list above
  is real for this app.
- Don't claim more testers/usage than actually happened.

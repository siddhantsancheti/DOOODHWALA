# DOOODHWALA — Store Listing Content

## App Details
- **App Name:** DOOODHWALA
- **Bundle ID (iOS):** com.dooodhwala.app
- **Package Name (Android):** com.dooodhwala.app
- **Version:** 1.0.0
- **Category:** Food & Drink / Lifestyle
- **Content Rating:** Everyone (3+)
- **Privacy Policy URL:** https://dooodhwala.com/privacy-policy
- **Support Email:** support@dooodhwala.com

---

## Short Description (80 chars — Play Store)
Fresh dairy delivered daily. Track your milkman in real time.

## Full Description (Play Store & App Store)

DOOODHWALA connects you directly with trusted local milkmen for fresh dairy products delivered to your doorstep every morning.

**For Customers:**
• Order fresh milk, curd, paneer and other dairy products daily
• Assign your own dedicated milkman ("Your Doodhwala")
• Track your milkman live on a map — know exactly when delivery arrives
• Pause, modify or cancel orders anytime
• Monthly billing with UPI, Razorpay or Cash on Delivery
• Family shared billing — one bill for the whole household
• Order history, analytics and spending insights
• In-app chat with your milkman

**For Milkmen:**
• Manage all your customers from one dashboard
• Optimized delivery route with live map navigation
• Mark deliveries complete and collect COD with OTP verification
• Set custom pricing per customer
• Real-time chat with customers
• Monthly earnings and commission tracking
• Inventory management

**Key Features:**
✓ Live GPS delivery tracking
✓ OTP-based secure login — no passwords needed
✓ Multi-language support (English, Hindi, Marathi)
✓ Dark mode support
✓ Push notifications for delivery updates
✓ Works offline for viewing order history

---

## Keywords
milk delivery, dairy delivery, doodhwala, milkman app, fresh milk, daily delivery, subscription milk, cow milk, buffalo milk, curd delivery, paneer delivery, morning delivery, local milkman

---

## What's New (Version 1.0.0)
- Initial release
- Live GPS tracking for deliveries
- In-app chat between customers and milkmen
- Monthly billing with UPI and Razorpay
- Multi-language support (English, Hindi, Marathi)
- Dark mode

---

## Screenshots Required

### Android (Google Play) — 1080x1920 px minimum, up to 8 screenshots
1. Home / Customer Dashboard — showing assigned milkman + today's order
2. Live Tracking Screen — map with milkman location
3. Order Screen — placing/modifying today's order
4. Bills Screen — monthly bill breakdown
5. In-App Chat — conversation with milkman
6. Milkman Dashboard — route and customer list
7. Your Doodhwala Screen — milkman profile and products
8. Login Screen — OTP phone auth

### iOS (App Store) — 6.7" (1290x2796), 6.5" (1242x2688), 5.5" (1242x2208)
Same 8 screenshots as above, rendered at each size.

---

## Submission Checklist

### Google Play Store
- [ ] Create app at play.google.com/console
- [ ] Upload signed AAB from EAS: `eas build --platform android --profile production`
- [ ] Fill in store listing (use content above)
- [ ] Upload screenshots (8 per form factor)
- [ ] Upload feature graphic (1024x500 px)
- [ ] Upload high-res icon (512x512 px)
- [ ] Set content rating (complete questionnaire)
- [ ] Add privacy policy URL
- [ ] Set up data safety section
- [ ] Create `play-store-service-account.json` from Google Play Console → Setup → API access
- [ ] Update eas.json serviceAccountKeyPath and run: `eas submit --platform android`

### Apple App Store
- [ ] Create app at appstoreconnect.apple.com
- [ ] Note your ASC App ID and Apple Team ID
- [ ] Update eas.json submit.production.ios with your appleId, ascAppId, appleTeamId
- [ ] Build: `eas build --platform ios --profile production`
- [ ] Fill in App Information (name, subtitle, keywords, description)
- [ ] Upload screenshots for all device sizes
- [ ] Set age rating
- [ ] Add privacy policy URL
- [ ] Complete App Privacy questionnaire (data types collected)
- [ ] Submit: `eas submit --platform ios`

---

## Data Safety / Privacy Questionnaire

### Data Collected
| Data Type | Purpose | Required |
|---|---|---|
| Phone number | Authentication via OTP | Yes |
| Name | User profile | Yes |
| Address | Delivery location | Yes |
| Precise location | Live delivery tracking | Yes |
| Coarse location | Finding nearby milkmen | Yes |
| Payment info | Order payments (handled by Razorpay) | Yes |
| Device identifiers | Push notifications (FCM token) | Yes |
| Photos | Profile picture | Optional |

### Data Sharing
- Location is shared with assigned milkman for delivery tracking
- Payment data is processed by Razorpay (PCI compliant)
- No data is sold to third parties

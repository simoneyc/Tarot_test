# Google Analytics 4 setup

The site contains a consent-first GA4 integration. No Google Analytics request is made until a visitor chooses **Allow analytics**.

1. Open Google Analytics and create a GA4 property.
2. Create a Web data stream for the GitHub Pages URL.
3. Copy the Measurement ID beginning with `G-`.
4. Open `js/analytics.js` and replace `G-XXXXXXXXXX` with that ID.
5. Keep advertising features disabled unless the privacy notice and consent flow are intentionally expanded.
6. Test the deployed site, accept analytics, then check **Reports > Realtime** in GA4.

Only general website traffic is sent. Tarot questions, selected cards, AI readings, and local history are not included in analytics events.

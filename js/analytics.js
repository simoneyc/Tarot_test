// Replace this value with the Measurement ID from your GA4 web data stream.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const ANALYTICS_CONSENT_KEY = 'tarot_analytics_consent';

function hasAnalyticsConfiguration() {
    return /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && !GA_MEASUREMENT_ID.includes('XXXX');
}

function setAnalyticsPanelVisibility(showPanel) {
    const panel = document.getElementById('analyticsConsentPanel');
    const settings = document.getElementById('analyticsSettingsButton');
    if (panel) panel.hidden = !showPanel;
    if (settings) settings.hidden = showPanel || !hasAnalyticsConfiguration();
}

function loadGoogleAnalytics() {
    if (!hasAnalyticsConfiguration() || document.querySelector('script[data-google-analytics]')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.dataset.googleAnalytics = 'true';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
}

function saveAnalyticsConsent(choice) {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
    if (choice === 'granted') {
        if (window.gtag) {
            window.gtag('consent', 'update', {
                analytics_storage: 'granted',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        }
        loadGoogleAnalytics();
    } else if (window.gtag) {
        window.gtag('consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    }
    setAnalyticsPanelVisibility(false);
}

function initializeAnalyticsConsent() {
    if (!hasAnalyticsConfiguration()) {
        console.info('GA4 analytics is disabled until GA_MEASUREMENT_ID is configured.');
        return;
    }

    const savedChoice = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (savedChoice === 'granted') loadGoogleAnalytics();
    setAnalyticsPanelVisibility(!['granted', 'denied'].includes(savedChoice));

    document.getElementById('acceptAnalyticsButton')?.addEventListener('click', () => saveAnalyticsConsent('granted'));
    document.getElementById('declineAnalyticsButton')?.addEventListener('click', () => saveAnalyticsConsent('denied'));
    document.getElementById('analyticsSettingsButton')?.addEventListener('click', () => setAnalyticsPanelVisibility(true));
}

document.addEventListener('DOMContentLoaded', initializeAnalyticsConsent);

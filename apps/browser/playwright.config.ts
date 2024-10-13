
// Watch out! This file gets regenerated on every run of the actor.
// Any changes you make will be lost.

// Tweak your configuration through the Actor's input through the Apify console or directly in the `input.json` file.
import { defineConfig } from '@playwright/test';
export default defineConfig({
    timeout: 60000,
    use: {
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        colorScheme: 'light',
        locale: 'en-US',
        video: 'off',
    },
    reporter: [
        ['html', { outputFolder: '/Users/vikramkhandelwal/apify_squire_scraper/squire-scraper/src/../playwright-report', open: 'never' }],
        ['json', { outputFile: '/Users/vikramkhandelwal/apify_squire_scraper/squire-scraper/src/../playwright-report/test-results.json' }]
    ],
});
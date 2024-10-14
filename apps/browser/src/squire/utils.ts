import { chromium, Browser, Page, Locator, BrowserContext } from "playwright";
import { storage } from "../lib/gc-storage/server";
import { env } from "../env";
// Utility Functions

async function appendErrorMessage(message: string) {
    //TODO
}

/**
 * Checks if a string is a valid weekday.
 * @param day - The day string to check.
 * @returns True if the string is a valid weekday, false otherwise.
 */
function isWeekday(day: string): boolean {
    const weekdays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    return weekdays.map((w) => w.toLowerCase()).includes(day.toLowerCase());
}

/**
 * Gets the next date for a given weekday.
 * @param weekday - The weekday name.
 * @returns The Date object for the next occurrence of the weekday.
 */
function getNextWeekdayDate(weekday: string): Date {
    const today = new Date();
    const targetWeekday = weekday.toLowerCase();
    const weekdays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
    ];
    const todayWeekdayIndex = today.getDay();
    const targetWeekdayIndex = weekdays.indexOf(targetWeekday);

    if (targetWeekdayIndex === -1) {
        throw new Error(`Invalid weekday: ${weekday}`);
    }

    let daysToAdd = (targetWeekdayIndex - todayWeekdayIndex + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // If the target day is today, move to next week

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
}

// Browser and Page Setup
export async function launchBrowser(): Promise<{ browser: Browser }> {
    const browser = await chromium.launch({
        headless: true,
        executablePath: "/ms-playwright/chromium-1076/chrome-linux/chrome",
        //executablePath: "/Users/max/Library/Caches/ms-playwright/chromium-1076/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    });

    return { browser };
}

/**
 * Launches the Chromium browser and navigates to the target booking page.
 * @returns An object containing the browser and the initialized page.
 */
export async function newContextAndNavigate(
    browser: Browser,
    url: string
): Promise<{ page: Page; context: BrowserContext }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    return { page, context };
}

// Interaction Handlers

/**
 * Clicks the "Allow All Cookies" button on the page.
 * @param page - The Playwright Page object.
 */
async function acceptAllCookies(page: Page): Promise<void> {
    const allowCookiesButton = page.locator("button", { hasText: "Allow All" });
    await allowCookiesButton
        .first()
        .waitFor({ state: "visible", timeout: 5000 })
        .then(async () => {
            await allowCookiesButton.first().click();
            console.log("Accepted all cookies.");
        })
        .catch((e) => {
            console.warn('"Allow All Cookies" button not found.');
        });
}

/**
 * Waits for the availability and professional selection elements to be visible.
 * @param page - The Playwright Page object.
 */
async function waitForAvailabilityAndProfessionalSelection(
    page: Page
): Promise<void> {
    const availableProfessionals = page.locator("p", { hasText: "Available" });
    await availableProfessionals
        .first()
        .waitFor({ state: "visible", timeout: 10000 });

    const professionalSelectionPrompt = page.locator("p", {
        hasText: "Choose a professional",
    });
    await professionalSelectionPrompt.waitFor({
        state: "visible",
        timeout: 10000,
    });
}

/**
 * Selects a barber based on the provided barber name.
 * @param page - The Playwright Page object.
 * @param barberName - Name of the barber to select.
 */
async function selectBarber(page: Page, barberName: string): Promise<void> {
    try {
        const professionalSelectionPrompt = page.locator("p", {
            hasText: "Choose a professional",
        });
        await professionalSelectionPrompt.waitFor({
            state: "visible",
            timeout: 10000,
        });

        const lastSibling = professionalSelectionPrompt.locator(
            "xpath=following-sibling::*[last()]"
        );
        await lastSibling.waitFor({ state: "visible", timeout: 10000 });

        const parentDivs = lastSibling.locator("> div");
        const parentDivCount = await parentDivs.count();

        for (let i = 0; i < parentDivCount; i++) {
            const parentDiv = parentDivs.nth(i);
            const barberElements = parentDiv.locator("p");
            const barberCount = await barberElements.count();

            for (let j = 0; j < Math.floor(barberCount / 2); j++) {
                const barberElement = barberElements.nth(j * 2);
                const name = (await barberElement.textContent())?.trim();
                if (name && name.toLowerCase() === barberName.toLowerCase()) {
                    await barberElement.click();
                    console.log(`Selected barber: ${barberName}`);
                    return;
                }
            }
        }
        throw new Error(`Barber "${barberName}" not found.`);
    } catch (error) {
        console.error(
            error as Error,
            `Error in selectBarber: ${(error as Error).message}`
        );
        await appendErrorMessage(
            `selectBarber Error: ${
                (error as Error).stack || (error as Error).message
            }`
        );
        throw error;
    }
}

/**
 * Selects a service based on the provided service name.
 * @param page - The Playwright Page object.
 * @param serviceName - Name of the service to select.
 */
async function selectService(page: Page, serviceName: string): Promise<void> {
    try {
        const servicePrompt = page.locator("p", {
            hasText: "Choose a service",
        });
        await servicePrompt.waitFor({ state: "visible", timeout: 10000 });

        const serviceContainer = servicePrompt.locator(
            "xpath=ancestor::div[1]"
        );
        await serviceContainer.waitFor({ state: "visible", timeout: 5000 });

        const serviceElement = page.locator("div", { hasText: serviceName });
        await serviceElement
            .first()
            .waitFor({ state: "visible", timeout: 10000 });

        const serviceSiblings = serviceContainer.locator(
            "xpath=following-sibling::div[position() >= 2]"
        );
        const serviceSiblingCount = await serviceSiblings.count();

        for (let j = 0; j < serviceSiblingCount; j++) {
            const serviceDiv = serviceSiblings.nth(j);
            const childDivs = serviceDiv.locator("> div");
            const childDivCount = await childDivs.count();

            for (let k = 0; k < childDivCount; k++) {
                const serviceChildDiv = childDivs.nth(k);
                const serviceParagraphs = serviceChildDiv.locator("p");
                const paragraphCount = await serviceParagraphs.count();

                if (paragraphCount >= 3) {
                    const name = (
                        await serviceParagraphs.nth(0).textContent()
                    )?.trim();
                    if (
                        name &&
                        name.toLowerCase() === serviceName.toLowerCase()
                    ) {
                        await serviceChildDiv.click();
                        console.log(`Selected service: ${serviceName}`);
                        return;
                    }
                }
            }
        }
        throw new Error(`Service "${serviceName}" not found.`);
    } catch (error) {
        console.error(
            error as Error,
            `Error in selectService: ${(error as Error).message}`
        );
        await appendErrorMessage(
            `selectService Error: ${
                (error as Error).stack || (error as Error).message
            }`
        );
        throw error;
    }
}

/**
 * Selects a day based on the provided day input (weekday or date).
 * @param page - The Playwright Page object.
 * @param dayInput - The day to select (weekday or date).
 */
async function selectDay(page: Page, dayInput: string): Promise<void> {
    try {
        // Locate and click the "Today" button to bring up the day selection
        const todayButton = page.locator("button", { hasText: "Today" });
        await todayButton.first().click();

        // Navigate to the day buttons based on the DOM structure you described
        const todayButtonGrandparent = todayButton.locator("..").locator("..");
        const secondChildOfGrandparent = todayButtonGrandparent
            .locator("> *")
            .nth(1);
        const childOfSecondChild = secondChildOfGrandparent
            .locator("> *")
            .locator("> *");

        // The day buttons are divs that have a child div
        const dayButtons = childOfSecondChild.filter({
            has: page.locator("> div"),
        });

        const daysCount = await dayButtons.count();
        console.log(`Total days available: ${daysCount}`);

        const today = new Date();
        let targetDate: Date;

        if (isWeekday(dayInput)) {
            // dayInput is a weekday
            targetDate = getNextWeekdayDate(dayInput);
        } else {
            // Assume dayInput is a date in format YYYY-MM-DD
            targetDate = new Date(dayInput);
            if (isNaN(targetDate.getTime())) {
                throw new Error(`Invalid date input: ${dayInput}`);
            }
        }

        const daysDifference = Math.floor(
            (targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
        );

        const indexToClick = daysDifference; // Assuming the days are listed from today onwards

        if (indexToClick < 0 || indexToClick >= daysCount) {
            throw new Error(`Day "${dayInput}" is out of range.`);
        }

        const dayToClick = dayButtons.nth(indexToClick);
        await dayToClick.click();
        console.log(`Selected day: ${dayInput}`);
    } catch (error) {
        console.error(
            error as Error,
            `Error in selectDay: ${(error as Error).message}`
        );
        await appendErrorMessage(
            `selectDay Error: ${
                (error as Error).stack || (error as Error).message
            }`
        );
        throw error;
    }
}

/**
 * Selects a time slot based on the provided time input.
 * @param page - The Playwright Page object.
 * @param timeInput - The time to select.
 */
async function selectTime(page: Page, timeInput: string): Promise<void> {
    try {
        // Locate the time slots with the given time input
        const timeSlots = page.locator("button", { hasText: timeInput });

        // Wait for the time slot to be visible with a timeout
        try {
            await timeSlots
                .first()
                .waitFor({ state: "visible", timeout: 10000 });
        } catch (error) {
            throw new Error(
                `Time "${timeInput}" not available or took too long to appear.`
            );
        }

        // Check if any time slots are found
        const timeSlotCount = await timeSlots.count();
        if (timeSlotCount === 0) {
            throw new Error(`Time "${timeInput}" not available.`);
        }

        // Click on the time slot
        await timeSlots.first().click();
        console.log(`Selected time: ${timeInput}`);
    } catch (error) {
        console.error(
            error as Error,
            `Error in selectTime: ${(error as Error).message}`
        );
        await appendErrorMessage(
            `selectTime Error: ${
                (error as Error).stack || (error as Error).message
            }`
        );
        throw error;
    }
}

export interface BookSquireAppointmentInput {
    url: string;
    barberName: string;
    serviceName: string;
    day: string; // could be a weekday or a date
    time: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
}

export const bookSquireAppointment = async (
    input: BookSquireAppointmentInput,
    browser_arg?: Browser
): Promise<boolean> => {
    // Extract the target URL and other inputs from the input
    const targetUrl: string = input.url;
    const barberName: string = input.barberName;
    const serviceName: string = input.serviceName;
    const dayInput: string = input.day;
    const timeInput: string = input.time;
    const firstName: string = input.firstName;
    const lastName: string = input.lastName;
    const phoneNumber: string = input.phoneNumber;
    const email: string = input.email;

    if (!targetUrl || !barberName || !serviceName || !dayInput || !timeInput) {
        throw new Error(
            'Missing input parameters. Please provide "url", "barberName", "serviceName", "day", and "time" fields.'
        );
    }
    console.log(`Starting booking process for URL: ${targetUrl}`);

    // Launch Playwright browser and navigate to the target URL
    const startingTime = new Date();
    let browser = browser_arg;
    if (!browser) {
        const _browser = await launchBrowser();
        browser = _browser.browser;
    }
    const startingTimeContext = new Date();
    const { context, page } = await newContextAndNavigate(browser, targetUrl);
    const elapsedTime =
        (new Date().getTime() - startingTimeContext.getTime()) / 1000;
    console.log(`Navigated to page in ${elapsedTime} seconds.`);

    let success = false;
    try {
        await acceptAllCookies(page);
        await waitForAvailabilityAndProfessionalSelection(page);
        await selectBarber(page, barberName);
        await selectService(page, serviceName);
        const chooseTimeButton = page.locator("button", {
            hasText: "Choose a time",
        });
        await chooseTimeButton.first().click();
        await selectDay(page, dayInput);
        await selectTime(page, timeInput);
        // click the Continue button
        await page.getByTestId("button:cart:toPayment").click();
        await page.getByRole("button", { name: "I agree" }).click();
        await page.getByTestId("button:paymentMethod:payInPerson").click();
        await page.getByPlaceholder("First Name").click();
        await page.getByPlaceholder("First Name").fill(firstName);
        await page.getByPlaceholder("First Name").press("Tab");
        await page.getByPlaceholder("Last Name").fill(lastName);
        await page.getByPlaceholder("Last Name").press("Tab");
        await page.getByPlaceholder("Phone").fill(phoneNumber);
        await page.getByPlaceholder("Phone").press("Tab");
        await page.getByPlaceholder("Email").fill(email);

        await page.getByTestId("button:checkoutPopup:book").click();
        await page.getByRole("button", { name: "Skip" }).click();

        // wait for the text "Success" to appear
        const booking_success = page.locator("p", { hasText: "Success" });
        await booking_success.waitFor({ state: "visible", timeout: 10000 });
        const confirmed = page.locator("p", { hasText: "confirmed" });
        await confirmed.waitFor({ state: "visible", timeout: 10000 });

        // Take screenshot
        const screenshotBuffer = await page.screenshot();
        await storage
            .bucket(env.GC_BUCKET_NAME)
            .file(
                `bookings/${encodeURIComponent(
                    targetUrl
                )}/success/${new Date().toISOString()}.png`
            )
            .save(screenshotBuffer, (err) => {
                if (err) {
                    console.error("Failed to save screenshot: ", err);
                }
            });

        console.log("Screenshot taken and saved to OUTPUT.");
        success = true;
    } catch (error) {
        success = false;
        console.error(
            error as Error,
            "An error occurred during the booking process."
        );
        try {
            const screenshotBuffer = await page.screenshot();
            await storage
                .bucket(env.GC_BUCKET_NAME)
                .file(
                    `bookings/${encodeURIComponent(
                        targetUrl
                    )}/error/${new Date().toISOString()}.png`
                )
                .save(screenshotBuffer, (err) => {
                    if (err) {
                        console.error("Failed to save screenshot: ", err);
                    }
                });
        } catch (e) {
            console.error("Failed to take screenshot: ", e);
        }
    } finally {
        if (!browser_arg) {
            await browser?.close().catch((e) => {
                console.error("Error closing browser: ", e);
            });
        }
        const endTime = new Date();
        const elapsedTime = (endTime.getTime() - startingTime.getTime()) / 1000;
        console.log(`\nExecution completed in ${elapsedTime} seconds.`);
        return success;
    }
};

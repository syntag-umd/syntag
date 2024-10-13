import { chromium, Browser, Page, Locator } from "playwright";

import express from "express";
import {
    bookSquireAppointment,
    BookSquireAppointmentInput,
    launchBrowser,
} from "./utils";
export const router = express.Router();

router.post("/squire/shop/:shop_name/book", async (req, res) => {
    console.log(req.params.shop_name, req.body);
    const shop_name = req.params.shop_name;
    const targetUrl = `https://getsquire.com/booking/book/${shop_name}`;

    const startingTime = new Date();
    let { browser } = await launchBrowser();
    const elapsedTime = (new Date().getTime() - startingTime.getTime()) / 1000;
    console.log(`Launched browser in ${elapsedTime} seconds.`);

    const input: BookSquireAppointmentInput = req.body;
    if (!input.url) {
        input.url = targetUrl;
    }
    let success = false;
    try {
        success = await bookSquireAppointment(input, browser);
    } catch (e) {
        console.error("Error booking appointment: ", e);
    }
    await browser.close().catch((e) => {
        console.error("Error closing browser: ", e);
    });

    if (!success) {
        res.status(500).send({ message: "Possible error booking appointment" });
    } else {
        res.send({ message: "Book added to shop" });
    }
});

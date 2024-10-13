import express from "express";
import dotenv from "dotenv";
try {
    dotenv.config({ path: ".env.local" });
} catch (e) {
    console.log("Failed to load .env.local: ", e);
}

const PORT = 3000;
const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get("/test", (req, res) => {
    res.send("Testing!");
});
import { router as squireRouter } from "./squire/router";

app.use(squireRouter);

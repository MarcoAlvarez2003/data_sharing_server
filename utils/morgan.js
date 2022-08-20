import { debug } from "./vars.js";
import express from "express";

/**
 * @param {Express} app
 */
export async function morgan(app) {
    if (debug === "*") {
        const morgan = (await import("morgan")).default;

        app.use(morgan("dev"));
    }
}

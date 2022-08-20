/// <reference path="../env.d.ts"/>

export const port = parseInt(process.env.PORT ?? "8080");
export const host = process.env.HOST ?? "localhost";

export const debug = process.env.DEBUG;

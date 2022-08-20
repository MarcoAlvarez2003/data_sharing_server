/// <reference path="../env.d.ts"/>

import { WebSocket } from "../utils/socket.io.js";
import { __dirname } from "../utils/dirname.js";
import { morgan } from "../utils/morgan.js";
import { Server } from "../utils/http.js";
import { GB } from "../utils/sizes.js";
import express from "express";
import path from "path";

import "dotenv/config";
import { host, port } from "../utils/vars.js";

const app = express();

/*
 * Middlewares
 */
await morgan(app);
app.use(express.json());
app.set("view engine", "ejs");
app.use("/", express.static(path.join(__dirname, "/public")));

/*
 * Routes
 */

app.route("/").get((req, res) => {
    res.render("../public/views/index.ejs");
    res.end();
});

/*
 * WebSockets
 */
const server = Server(app);
const socket = new WebSocket(server, {
    maxHttpBufferSize: GB,
});

/**
 * @type {Record<string, string>}
 */
const connections = {};

const Events = {
    "receive:message": "receive:message",
    "receive:folder": "receive:folder",
    "status:query": "status:query",
    "status:online": "status:online",
    "status:offline": "status:offline",
    "send:message": "send:message",
    "send:folder": "send:folder",
};

socket.on("connection", (client) => {
    console.log(`Connection was successfully with client: ${client.id}`);

    connections[client.id] = client.id;

    client.on(
        Events["send:message"],
        /**
         * Client Message
         * @param {Message} message
         */
        (message) => {
            client.to(message.to).emit(Events["receive:message"], message);
        }
    );

    client.on(
        Events["send:folder"],
        /**
         * Object with files
         * @param {Folder} folder
         */
        (folder) => {
            client.to(folder.to).emit(Events["receive:folder"], folder);
        }
    );

    client.on(
        Events["status:query"],

        /**
         * Target id
         * @param {string} id
         */
        (id) => {
            if (id in connections && id !== client.id) {
                return client.emit(Events["status:online"]);
            }

            client.emit(Events["status:offline"]);
        }
    );

    client.on("disconnect", () => {
        console.log(`Connection lost from ${client.id}`);
        delete connections[client.id];
    });
});

/*
 * Show Data
 */

server.listen(port, host, () => {
    console.log(`Server ready on http://${host}:${port}/`);
});

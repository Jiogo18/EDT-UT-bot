"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
const bot_1 = require("./bot/bot");
const client = new bot_1.Bot();
client.login();

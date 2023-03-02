"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const chalk = require("chalk");
const discord_js_1 = require("discord.js");
class Logger {
    constructor(bot) {
        this.bot = bot;
    }
    info(message) {
        console.log(chalk.gray(message));
    }
    log(message) {
        console.log(message);
    }
    warn(message) {
        console.warn(chalk.yellow(message));
    }
    error(message) {
        return __awaiter(this, void 0, void 0, function* () {
            message = `Error <t:${Math.floor(Date.now() / 1000)}:f>\n` + message;
            message = message.substring(0, 2000);
            console.error(chalk.red(message));
            // send an error message to DISCORD_ERROR_CHANNEL
            if (!this.bot.isReady()) {
                // wait 3 seconds
                yield new Promise(resolve => setTimeout(resolve, 3000));
                if (!this.bot.isReady()) {
                    console.error(chalk.red("Bot is not ready after 3 seconds, cannot send error message."));
                }
            }
            const channel = yield this.bot.channels.fetch(process.env.DISCORD_ERROR_CHANNEL);
            if ((channel === null || channel === void 0 ? void 0 : channel.isTextBased()) && !(channel instanceof discord_js_1.StageChannel)) {
                yield channel.send(message);
            }
        });
    }
}
exports.Logger = Logger;

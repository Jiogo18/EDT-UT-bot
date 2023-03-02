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
exports.registerCommands = void 0;
const bot_1 = require("../commands/bot");
const salle_1 = require("../commands/salle");
const edt_1 = require("../commands/edt");
var canPostCommands = true;
function postCommand(bot, command, guildId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!canPostCommands)
            return false;
        if (!bot.application)
            throw new Error("Bot application not found.");
        const cmdJson = command.toJSON();
        try {
            yield bot.application.commands.create(cmdJson, guildId);
            return true;
        }
        catch (error) {
            bot.LOGGER.error(`Posting command '${command.name}' code: ${error.httpStatus}`);
            if (!canPostCommands)
                return false; // on sait déjà qu'on peut pas poster
            switch (error === null || error === void 0 ? void 0 : error.code) {
                case 0:
                    bot.LOGGER.error(error.message);
                    canPostCommands = false; // quota des 200 messages
                    setTimeout(() => (canPostCommands = true), 10000); // réessayer dans 10 secondes
                    break;
                default:
                    bot.LOGGER.error(`Posting command : ${error}`);
                    break;
            }
            return false;
        }
    });
}
function registerCommands(bot) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load commands
        bot.commands.push(new bot_1.BotCommand(bot));
        bot.commands.push(new salle_1.SalleCommand(bot));
        bot.commands.push(new edt_1.EdtCommand(bot));
        if (process.env.POST_COMMANDS === "true") {
            // Register interactions
            const postedCommands = yield Promise.all(bot.commands.filter((command) => __awaiter(this, void 0, void 0, function* () { return postCommand(bot, command, undefined); })));
            bot.LOGGER.info(`Posted ${postedCommands.length} commands out of ${bot.commands.length} : ${postedCommands.map(x => x.name).join(', ')}`);
        }
        else {
            bot.LOGGER.info(`Loaded ${bot.commands.length} commands (not posting) : ${bot.commands.map(x => x.name).join(', ')}`);
        }
    });
}
exports.registerCommands = registerCommands;

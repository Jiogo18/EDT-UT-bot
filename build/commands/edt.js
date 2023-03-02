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
exports.EdtCommand = void 0;
const edtConfig_1 = require("../bot/edtConfig");
const base_1 = require("./base");
const actions = [
    {
        name: "info",
        callback: (cmdData) => __awaiter(void 0, void 0, void 0, function* () {
            if (!(yield canRunCommand(cmdData, { requireAdmin: false })))
                return;
            const calendars = Object.entries(cmdData.bot.edtManager.edts);
            yield cmdData.sendEmbed({
                title: "EDT Information",
                description: `Calendars: ${calendars.length}`,
                fields: calendars.map(([name, calendar]) => {
                    var _a, _b;
                    return ({
                        name,
                        value: `Last Update: <t:${Math.round(calendar.lastUpdate.getTime() / 1e3)}>\n` +
                            `Events: ${calendar.Events.length}\n` +
                            `First event LAST MODIFIED: <t:${Math.round(((_a = calendar.Events[0]) === null || _a === void 0 ? void 0 : _a.LAST_MODIFIED.getTime()) / 1e3)}>\n` +
                            `First event DTSTAMP: <t:${Math.round(((_b = calendar.Events[0]) === null || _b === void 0 ? void 0 : _b.DTSTAMP.getTime()) / 1e3)}>`,
                        inline: false
                    });
                })
            });
        })
    },
    {
        name: "download",
        callback: (cmdData) => __awaiter(void 0, void 0, void 0, function* () {
            if (!(yield canRunCommand(cmdData, { requireAdmin: true })))
                return;
            const batiment = edtConfig_1.edtConfig.defaultBatiment;
            const events = yield cmdData.bot.edtManager.getSallesEventsToday(batiment, new Date(), true); // force download
            yield cmdData.reply(`Events downloaded: ${cmdData.bot.edtManager.edts[batiment].Events.length}\n` +
                `Events today: ${events.length}`);
        })
    }
];
function canRunCommand(cmdData, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.requireAdmin) {
            if (!cmdData.source.member || cmdData.source.member.user.id !== process.env.ADMIN_USER_ID) {
                yield cmdData.reply("You are not allowed to use this command.");
                return false;
            }
        }
        return true;
    });
}
class EdtCommand extends base_1.ActionChoiceCommand {
    constructor(bot) {
        super(bot, "edt", "Manage the EDTs.", actions);
    }
}
exports.EdtCommand = EdtCommand;

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
exports.BotCommand = void 0;
const discord_js_1 = require("discord.js");
const base_1 = require("./base");
const actions = [
    {
        name: "info",
        callback: (cmdData) => __awaiter(void 0, void 0, void 0, function* () {
            if (!(yield canRunCommand(cmdData, { requireLocalId: false, requireAdmin: false })))
                return;
            const cpuUsage = process.cpuUsage();
            const cpu = {
                user: Math.round(cpuUsage.user / 1000000),
                system: Math.round(cpuUsage.system / 1000000)
            };
            const memUsage = process.memoryUsage();
            const mem = {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024)
            };
            yield cmdData.sendEmbed({
                title: "Bot Information",
                description: `Prefix: ${cmdData.bot.PREFIX}\n` +
                    `Local ID: ${cmdData.bot.local_id.toString()}\n` +
                    `Servers: ${cmdData.bot.guilds.cache.size}`,
                fields: [
                    {
                        name: "Session",
                        value: `Host: ${process.env.HOST_NAME}\nStarted: <t:${Math.floor((Date.now() - cmdData.bot.uptime) / 1000)}:f>`,
                        inline: true
                    },
                    {
                        name: "Resources",
                        value: `CPU: ${cpu.user} / ${cpu.system} ms\n` +
                            `Memory: ${mem.heapUsed} / ${mem.heapTotal} / ${mem.rss} Mo`,
                        inline: true
                    }
                ]
            });
        })
    },
    {
        name: "cut",
        callback: (cmdData) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            if (!(yield canRunCommand(cmdData, { requireLocalId: true, requireAdmin: true })))
                return;
            yield cmdData.reply("Goodbye!");
            cmdData.bot.LOGGER.info(`Stopped by ${(_b = (_a = cmdData.source.member) === null || _a === void 0 ? void 0 : _a.user.id) !== null && _b !== void 0 ? _b : "unknown"}.`);
            setTimeout(() => cmdData.bot.destroy(), 200);
            setTimeout(() => process.exit(0), 1000);
        })
    },
    {
        name: "reset_id",
        callback: (cmdData) => __awaiter(void 0, void 0, void 0, function* () {
            if (!(yield canRunCommand(cmdData, { requireLocalId: true, requireAdmin: true })))
                return;
            yield cmdData.reply(`Resetting local ID from ${cmdData.bot.local_id} to ${cmdData.bot.resetLocalId()}`);
        })
    }
];
function canRunCommand(cmdData, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const localId = (_a = cmdData.args[1]) === null || _a === void 0 ? void 0 : _a.value;
        if (options.requireLocalId) {
            console.log('localId', localId, cmdData.args);
            if (isNaN(localId)) {
                yield cmdData.reply("This command requires a local ID.");
                return false;
            }
            if (!cmdData.bot.isLocalId(localId)) {
                return false;
            }
        }
        else {
            if (!isNaN(localId) && !cmdData.bot.isLocalId(localId)) {
                return false;
            }
        }
        if (options.requireAdmin) {
            if (!cmdData.source.member || cmdData.source.member.user.id !== process.env.ADMIN_USER_ID) {
                yield cmdData.reply("You are not allowed to use this command.");
                return false;
            }
        }
        return true;
    });
}
class BotCommand extends base_1.ActionChoiceCommand {
    constructor(bot) {
        super(bot, "bot", "Display information about the bot.", actions, [
            {
                name: "localid",
                description: "The local ID of the bot.",
                type: discord_js_1.ApplicationCommandOptionType.Integer,
                required: false,
            }
        ], { deferReply: false, deferEphemeral: false });
    }
}
exports.BotCommand = BotCommand;

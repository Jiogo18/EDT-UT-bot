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
exports.Bot = void 0;
const discord_js_1 = require("discord.js");
const base_1 = require("../commands/base");
const commands_1 = require("./commands");
const edt_1 = require("./edt");
const logger_1 = require("./logger");
class Bot extends discord_js_1.Client {
    constructor() {
        super({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent] });
        this.commands = [];
        this.debug = false;
        this.LOGGER = new logger_1.Logger(this);
        this.PREFIX = process.env.COMMAND_PREFIX;
        // nombre à 3 chiffres
        this._local_id = this.resetLocalId();
        if (process.env.DEBUG === "true") {
            this.debug = true;
        }
        this.on(discord_js_1.Events.ClientReady, () => {
            var _a;
            this.LOGGER.info(`Logged in as ${this.user.tag}!`);
            (_a = this.user) === null || _a === void 0 ? void 0 : _a.setActivity("l'EDT de l'UT", { type: discord_js_1.ActivityType.Watching });
            (0, commands_1.registerCommands)(this);
        });
        this.on(discord_js_1.Events.InteractionCreate, (interaction) => __awaiter(this, void 0, void 0, function* () {
            if (!interaction.isCommand())
                return;
            const receivedCommand = base_1.ReceivedCommand.fromInteraction(this, interaction);
            if (!receivedCommand)
                return;
            if (receivedCommand.command.deferReply)
                interaction.deferReply({ ephemeral: receivedCommand.command.deferEphemeral });
            receivedCommand.run();
            if (!(yield interaction.fetchReply())) {
                receivedCommand.reply("Command executed.");
            }
        }));
        this.on(discord_js_1.Events.MessageCreate, (message) => __awaiter(this, void 0, void 0, function* () {
            const receivedCommand = base_1.ReceivedCommand.fromMessage(this, message);
            if (!receivedCommand)
                return;
            receivedCommand.run();
        }));
        this.edtManager = new edt_1.EdtManager(this);
    }
    get local_id() { return this._local_id; }
    resetLocalId() {
        const local_id = Math.floor(Math.random() * 1000);
        this._local_id = local_id;
        return local_id;
    }
    isLocalId(local_id) {
        return local_id == this.local_id || local_id == 0;
    }
    isDebugChannel(channelId) {
        return (channelId !== null) && (channelId === process.env.DISCORD_DEBUG_CHANNEL);
    }
    isContextAllowed(data) {
        return this.isDebugChannel(data.channelId) === this.debug;
    }
}
exports.Bot = Bot;

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
exports.ReceivedCommand = exports.ActionChoiceCommand = exports.BaseCommand = void 0;
const discord_js_1 = require("discord.js");
class BaseCommand {
    constructor(bot, cmdOptions) {
        var _a, _b;
        this.deferReply = false; // Send a deferred reply (user only, default false)
        this.deferEphemeral = false; // Send a deferred reply with ephemeral visibility
        this.bot = bot;
        this.name = cmdOptions.name;
        this.description = cmdOptions.description;
        this.options = cmdOptions.options;
        this.deferReply = (_a = cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.deferEphemeral) !== null && _a !== void 0 ? _a : false;
        this.deferEphemeral = (_b = cmdOptions === null || cmdOptions === void 0 ? void 0 : cmdOptions.deferEphemeral) !== null && _b !== void 0 ? _b : false;
    }
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            options: this.options
        };
    }
}
exports.BaseCommand = BaseCommand;
class ActionChoiceCommand extends BaseCommand {
    constructor(bot, name, description, actions, nextOtions, cmdOptions) {
        super(bot, Object.assign(Object.assign({}, cmdOptions), { name,
            description, options: [
                {
                    name: "action",
                    description: "The action to perform",
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    required: true,
                    choices: actions.map(action => ({ name: action.name, value: action.name }))
                },
                ...nextOtions !== null && nextOtions !== void 0 ? nextOtions : []
            ] }));
        this.actions = actions;
    }
    runCommand(cmdData) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const argName = (_a = cmdData.args[0]) === null || _a === void 0 ? void 0 : _a.value;
            const localId = (_b = cmdData.args[1]) === null || _b === void 0 ? void 0 : _b.value;
            const action = this.actions.find(action => action.name === argName);
            if (!action) {
                yield cmdData.reply("Unknown subcommand.");
                return;
            }
            yield action.callback(cmdData);
        });
    }
}
exports.ActionChoiceCommand = ActionChoiceCommand;
class ReceivedCommand {
    constructor(source, command, args) {
        this.source = source;
        this.bot = command.bot;
        this.command = command;
        this.args = args;
    }
    static fromInteraction(bot, interaction) {
        if (!bot.isContextAllowed(interaction))
            return null; // ignore debug channel if not in debug mode
        const command = bot.commands.find(command => command.name === interaction.commandName);
        if (!command) {
            bot.LOGGER.error(`Command ${interaction.commandName} not found.`);
            return null;
        }
        return new ReceivedCommand(interaction, command, interaction.options.data);
    }
    static fromMessage(bot, message) {
        var _a;
        if (!message.content.startsWith(bot.PREFIX))
            return null;
        if (!bot.isContextAllowed(message))
            return null; // ignore debug channel if not in debug mode
        const args = message.content.slice(bot.PREFIX.length).trim().split(/ +/).map(arg => {
            const cmdArg = {
                name: "",
                value: arg,
                type: discord_js_1.ApplicationCommandOptionType.String,
            };
            return cmdArg;
        });
        const commandName = ((_a = args.shift()) === null || _a === void 0 ? void 0 : _a.value).toLocaleLowerCase();
        const command = bot.commands.find(command => command.name === commandName);
        if (!command)
            return null;
        return new ReceivedCommand(message, command, args);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.bot.LOGGER.info(`Running command ${this.command.name} from ${this.source instanceof discord_js_1.Message ? "message" : "interaction"}.`);
                yield this.command.runCommand(this);
            }
            catch (e) {
                this.bot.LOGGER.error(`Command ${this.command.name} failed: ${e}`);
                yield this.reply("An error occured while running the command.");
            }
        });
    }
    reply(content) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.source instanceof discord_js_1.CommandInteraction) {
                // Try replying to the interaction
                try {
                    return yield this.source.reply(content);
                }
                catch (e) {
                    // Try editing the reply
                    try {
                        return yield this.source.editReply(content);
                    }
                    catch (e) {
                        // Try sending a message in the channel
                        let channel;
                        if (((_a = this.source.channel) === null || _a === void 0 ? void 0 : _a.isTextBased()) && !(this.source.channel instanceof discord_js_1.StageChannel)) {
                            channel = this.source.channel;
                        }
                        else {
                            const channelFetched = yield this.command.bot.channels.fetch(this.source.channelId);
                            if ((channelFetched === null || channelFetched === void 0 ? void 0 : channelFetched.isTextBased()) && !(channelFetched instanceof discord_js_1.StageChannel)) {
                                channel = channelFetched;
                            }
                        }
                        if (channel) {
                            return yield channel.send(content);
                        }
                        else {
                            throw e;
                        }
                    }
                }
            }
            else {
                return yield this.source.reply(content);
            }
        });
    }
    sendEmbed(embed) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reply({ embeds: [embed] });
        });
    }
    sendError(source, error) {
        return __awaiter(this, void 0, void 0, function* () {
            if (source instanceof discord_js_1.Message) {
                this.bot.LOGGER.error(`Error message sent by ${source.client.user.username}: ${error}`);
            }
            else {
                this.bot.LOGGER.error(`Error interaction sent by ${source.user.username}: ${error}`);
            }
            yield this.reply(`Sorry, an error occurred: ${error}`);
        });
    }
}
exports.ReceivedCommand = ReceivedCommand;

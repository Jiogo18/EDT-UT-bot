import { APIEmbed, ApplicationCommandDataResolvable, ApplicationCommandOption, ApplicationCommandOptionType, BaseMessageOptions, CommandInteraction, CommandInteractionOption, InteractionResponse, Message, TextChannel } from "discord.js";
import { Bot } from "../bot/bot";

export type CommandSource = Message | CommandInteraction;
export type CommandArgument = string | number | boolean | undefined;

export abstract class BaseCommand {
	readonly bot: Bot;
	readonly name: string;
	readonly description: string;
	readonly options?: ApplicationCommandOption[];
	readonly deferReply: boolean = false; // Send a deferred reply (user only, default false)
	readonly deferEphemeral: boolean = false; // Send a deferred reply with ephemeral visibility

	constructor(bot: Bot, cmdOptions: { name: string, description: string, options?: ApplicationCommandOption[], deferReply?: boolean, deferEphemeral?: boolean }) {
		this.bot = bot;
		this.name = cmdOptions.name;
		this.description = cmdOptions.description;
		this.options = cmdOptions.options;
		this.deferReply = cmdOptions?.deferEphemeral ?? false;
		this.deferEphemeral = cmdOptions?.deferEphemeral ?? false;
	}

	abstract runCommand(cmdData: ReceivedCommand): Promise<void>;

	toJSON(): ApplicationCommandDataResolvable {
		return {
			name: this.name,
			description: this.description,
			options: this.options
		};
	}
}

export class ActionChoiceCommand extends BaseCommand {
	readonly actions: { name: string, callback: (cmdData: ReceivedCommand) => Promise<void> }[];

	constructor(bot: Bot, name: string, description: string, actions: { name: string, callback: (cmdData: ReceivedCommand) => Promise<void> }[], nextOtions?: ApplicationCommandOption[], cmdOptions?: { deferReply?: boolean, deferEphemeral?: boolean }) {
		super(bot, {
			...cmdOptions,
			name,
			description,
			options: [
				{
					name: "action",
					description: "The action to perform",
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: actions.map(action => ({ name: action.name, value: action.name }))
				},
				...nextOtions ?? []
			],
		});
		this.actions = actions;
	}

	async runCommand(cmdData: ReceivedCommand): Promise<void> {
		const argName = cmdData.args[0]?.value as string;
		const localId = cmdData.args[1]?.value as number;
		const action = this.actions.find(action => action.name === argName);

		if (!action) {
			await cmdData.reply("Unknown subcommand.");
			return;
		}

		await action.callback(cmdData);
	}

}

export class ReceivedCommand {
	readonly source: CommandInteraction | Message;
	readonly bot: Bot;
	readonly command: BaseCommand;
	readonly args: readonly CommandInteractionOption[];

	private constructor(source: CommandInteraction | Message, command: BaseCommand, args: readonly CommandInteractionOption[]) {
		this.source = source;
		this.bot = command.bot;
		this.command = command;
		this.args = args;
	}

	static fromInteraction(bot: Bot, interaction: CommandInteraction): ReceivedCommand | null {
		if (!bot.isContextAllowed(interaction)) return null; // ignore debug channel if not in debug mode

		const command = bot.commands.find(command => command.name === interaction.commandName);
		if (!command) {
			bot.LOGGER.error(`Command ${interaction.commandName} not found.`);
			return null;
		}
		return new ReceivedCommand(interaction, command, interaction.options.data);
	}

	static fromMessage(bot: Bot, message: Message): ReceivedCommand | null {
		if (!message.content.startsWith(bot.PREFIX)) return null;
		if (!bot.isContextAllowed(message)) return null; // ignore debug channel if not in debug mode

		const args = message.content.slice(bot.PREFIX.length).trim().split(/ +/).map(arg => {
			const cmdArg: CommandInteractionOption = {
				name: "",
				value: arg,
				type: ApplicationCommandOptionType.String,
			};
			return cmdArg;
		});
		const commandName = (args.shift()?.value as string).toLocaleLowerCase();

		const command = bot.commands.find(command => command.name === commandName);
		if (!command) return null;

		return new ReceivedCommand(message, command, args);
	}

	async run(): Promise<void> {
		try {
			this.bot.LOGGER.info(`Running command ${this.command.name} from ${this.source instanceof Message ? "message" : "interaction"}.`);
			await this.command.runCommand(this);
		}
		catch (e) {
			this.bot.LOGGER.error(`Command ${this.command.name} failed: ${e}`);
			await this.reply("An error occured while running the command.");
		}
	}

	async reply(content: string | BaseMessageOptions): Promise<Message | InteractionResponse<boolean> | void> {
		if (this.source instanceof CommandInteraction) {
			// Try replying to the interaction
			try {
				return await this.source.reply(content);
			}
			catch (e) {

				// Try editing the reply
				try {
					return await this.source.editReply(content);
				}
				catch (e) {
					// Try sending a message in the channel
					let channel = this.source.channel;
					if (!channel) {
						const channelFetched = await this.command.bot.channels.fetch(this.source.channelId);
						if (channelFetched instanceof TextChannel) {
							channel = channelFetched;
						}
					}
					if (channel) {
						return await channel.send(content);
					}
					else {
						throw e;
					}
				}
			}
		}
		else {
			return await this.source.reply(content);
		}
	}

	async sendEmbed(embed: APIEmbed): Promise<void> {
		await this.reply({ embeds: [embed] });
	}
	async sendError(source: CommandSource, error: string): Promise<void> {
		if (source instanceof Message) {
			this.bot.LOGGER.error(`Error message sent by ${source.client.user.username}: ${error}`);
		} else {
			this.bot.LOGGER.error(`Error interaction sent by ${source.user.username}: ${error}`);
		}
		await this.reply(`Sorry, an error occurred: ${error}`);
	}
}
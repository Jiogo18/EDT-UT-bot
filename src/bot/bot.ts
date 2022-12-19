import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";
import { BaseCommand, ReceivedCommand } from "../commands/base";
import { registerCommands } from "./commands";
import { EdtManager } from "./edt";
import { Logger } from "./logger";

export class Bot extends Client {
	readonly commands: BaseCommand[] = [];
	readonly debug: boolean = false;
	readonly LOGGER: Logger = new Logger(this);
	readonly PREFIX: string = process.env.COMMAND_PREFIX!;
	readonly edtManager: EdtManager;

	constructor() {
		super({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
		if (process.env.DEBUG === "true") {
			this.debug = true;
		}

		this.on(Events.ClientReady, () => {
			this.LOGGER.info(`Logged in as ${this.user!.tag}!`);
			this.user?.setActivity("l'EDT de l'UT", { type: ActivityType.Watching });
			registerCommands(this);
		});

		this.on(Events.InteractionCreate, async interaction => {
			if (!interaction.isCommand()) return;

			const receivedCommand = ReceivedCommand.fromInteraction(this, interaction);
			if (!receivedCommand) return;

			if (receivedCommand.command.deferReply)
				interaction.deferReply({ ephemeral: receivedCommand.command.deferEphemeral });

			receivedCommand.run();

			if (!(await interaction.fetchReply())) {
				receivedCommand.reply("Command executed.");
			}
		});

		this.on(Events.MessageCreate, async message => {
			const receivedCommand = ReceivedCommand.fromMessage(this, message);
			if (!receivedCommand) return;
			receivedCommand.run();
		});

		this.edtManager = new EdtManager(this);
	}

	// nombre à 3 chiffres
	private _local_id: number = this.resetLocalId();
	get local_id(): number { return this._local_id; }
	resetLocalId(): number {
		const local_id = Math.floor(Math.random() * 1000);
		this._local_id = local_id;
		return local_id;
	}
	isLocalId(local_id: number): boolean {
		return local_id == this.local_id || local_id == 0;
	}


	isDebugChannel(channelId: string | null): boolean {
		return (channelId !== null) && (channelId === process.env.DISCORD_DEBUG_CHANNEL);
	}
	isContextAllowed(data: { channelId: string | null }): boolean {
		return this.isDebugChannel(data.channelId) === this.debug;
	}
}
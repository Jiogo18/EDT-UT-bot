import * as chalk from "chalk";
import { StageChannel, TextChannel } from "discord.js";
import { Bot } from "./bot";


export class Logger {
	bot: Bot;

	constructor(bot: Bot) {
		this.bot = bot;
	}

	info(message: string) {
		console.log(chalk.gray(message));
	}

	log(message: string) {
		console.log(message);
	}

	warn(message: string) {
		console.warn(chalk.yellow(message));
	}

	async error(message: string) {
		message = `Error <t:${Math.floor(Date.now() / 1000)}:f>\n` + message;
		message = message.substring(0, 2000);

		console.error(chalk.red(message));
		// send an error message to DISCORD_ERROR_CHANNEL
		if (!this.bot.isReady()) {
			// wait 3 seconds
			await new Promise(resolve => setTimeout(resolve, 3000));
			if (!(this.bot as Bot).isReady()) {
				console.error(chalk.red("Bot is not ready after 3 seconds, cannot send error message."));
			}
		}
		const channel = await this.bot.channels.fetch(process.env.DISCORD_ERROR_CHANNEL!);
		if (channel?.isTextBased() && !(channel instanceof StageChannel)) {
			await channel.send(message);
		}
	}
}
import { Bot } from "./bot";
import { BotCommand } from "../commands/bot";
import { BaseCommand } from "../commands/base";
import { ApplicationCommandDataResolvable, Snowflake } from "discord.js";
import { SalleCommand } from "../commands/salle";

var canPostCommands = true;

async function postCommand(bot: Bot, command: BaseCommand, guildId: Snowflake | undefined): Promise<boolean> {
	if (!canPostCommands) return false;
	if (!bot.application) throw new Error("Bot application not found.");

	const cmdJson: ApplicationCommandDataResolvable = command.toJSON();

	try {
		await bot.application.commands.create(cmdJson, guildId);
		return true;
	}
	catch (error: any) {
		bot.LOGGER.error(`Posting command '${command.name}' code: ${error.httpStatus}`);
		if (!canPostCommands) return false; // on sait déjà qu'on peut pas poster

		switch (error?.code) {
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
}

export async function registerCommands(bot: Bot): Promise<void> {
	// Load commands
	bot.commands.push(new BotCommand(bot));
	bot.commands.push(new SalleCommand(bot));

	if (process.env.POST_COMMANDS === "true") {
		// Register interactions
		const postedCommands = await Promise.all(bot.commands.filter(async command => postCommand(bot, command, undefined)));
		bot.LOGGER.info(`Posted ${postedCommands.length} commands out of ${bot.commands.length} : ${postedCommands.map(x => x.name).join(', ')}`);
	}
	else {
		bot.LOGGER.info(`Loaded ${bot.commands.length} commands (not posting) : ${bot.commands.map(x => x.name).join(', ')}`);
	}
}

import { ApplicationCommandOptionType } from "discord.js";
import { Bot } from "../bot/bot";
import { ActionChoiceCommand, ReceivedCommand } from "./base";

const actions: { name: string, callback: (cmdData: ReceivedCommand) => Promise<void> }[] = [
	{
		name: "info",
		callback: async (cmdData: ReceivedCommand) => {
			if (!(await canRunCommand(cmdData, { requireLocalId: false, requireAdmin: false }))) return;

			const cpuUsage = process.cpuUsage();
			const cpu = {
				user: Math.round(cpuUsage.user / 1000000),
				system: Math.round(cpuUsage.system / 1000000)
			}
			const memUsage = process.memoryUsage();
			const mem = {
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
				heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
				rss: Math.round(memUsage.rss / 1024 / 1024)
			}

			await cmdData.sendEmbed({
				title: "Bot Information",
				description: `Prefix: ${cmdData.bot.PREFIX}\n` +
					`Local ID: ${cmdData.bot.local_id.toString()}\n` +
					`Servers: ${cmdData.bot.guilds.cache.size}`,
				fields: [
					{
						name: "Session",
						value: `Host: ${process.env.HOST_NAME}\nStarted: <t:${Math.floor((Date.now() - cmdData.bot.uptime!) / 1000)}:f>`,
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
		}
	},
	{
		name: "cut",
		callback: async (cmdData: ReceivedCommand) => {
			if (!(await canRunCommand(cmdData, { requireLocalId: true, requireAdmin: true }))) return;
			await cmdData.reply("Goodbye!");
			cmdData.bot.LOGGER.info(`Stopped by ${cmdData.source.member?.user.id ?? "unknown"}.`);
			setTimeout(() => cmdData.bot.destroy(), 200);
			setTimeout(() => process.exit(0), 1000);
		}
	},
	{
		name: "reset_id",
		callback: async (cmdData: ReceivedCommand) => {
			if (!(await canRunCommand(cmdData, { requireLocalId: true, requireAdmin: true }))) return;
			await cmdData.reply(`Resetting local ID from ${cmdData.bot.local_id} to ${cmdData.bot.resetLocalId()}`);
		}
	}
];

async function canRunCommand(cmdData: ReceivedCommand, options: { requireLocalId?: boolean, requireAdmin?: boolean }): Promise<boolean> {
	const localId = cmdData.args[1]?.value as number;

	if (options.requireLocalId) {
		console.log('localId', localId, cmdData.args);
		if (isNaN(localId)) {
			await cmdData.reply("This command requires a local ID.");
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
			await cmdData.reply("You are not allowed to use this command.");
			return false;
		}
	}

	return true;
}

export class BotCommand extends ActionChoiceCommand {
	constructor(bot: Bot) {
		super(bot, "bot", "Display information about the bot.", actions, [
			{
				name: "localid",
				description: "The local ID of the bot.",
				type: ApplicationCommandOptionType.Integer,
				required: false,
			}
		], { deferReply: false, deferEphemeral: false });
	}
}

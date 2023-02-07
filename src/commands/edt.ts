import { Bot } from "../bot/bot";
import { edtConfig } from "../bot/edtConfig";
import { ActionChoiceCommand, ReceivedCommand } from "./base";

const actions: { name: string, callback: (cmdData: ReceivedCommand) => Promise<void> }[] = [
	{
		name: "info",
		callback: async (cmdData: ReceivedCommand) => {
			if (!(await canRunCommand(cmdData, { requireAdmin: false }))) return;

			const calendars = Object.entries(cmdData.bot.edtManager.edts);

			await cmdData.sendEmbed({
				title: "EDT Information",
				description: `Calendars: ${calendars.length}`,
				fields: calendars.map(([name, calendar]) => ({
					name,
					value: `Last Update: <t:${Math.round(calendar.lastUpdate.getTime() / 1e3)}>\n` +
						`Events: ${calendar.Events.length}\n` +
						`First event LAST MODIFIED: <t:${Math.round(calendar.Events[0]?.LAST_MODIFIED.getTime() / 1e3)}>\n` +
						`First event DTSTAMP: <t:${Math.round(calendar.Events[0]?.DTSTAMP.getTime() / 1e3)}>`,
					inline: false
				}))
			});
		}
	},
	{
		name: "download",
		callback: async (cmdData: ReceivedCommand) => {
			if (!(await canRunCommand(cmdData, { requireAdmin: true }))) return;

			const batiment = edtConfig.defaultBatiment;
			const events = await cmdData.bot.edtManager.getSallesEventsToday(batiment, new Date(), true); // force download

			await cmdData.reply(
				`Events downloaded: ${cmdData.bot.edtManager.edts[batiment].Events.length}\n` +
				`Events today: ${events.length}`);
		}
	}
];

async function canRunCommand(cmdData: ReceivedCommand, options: { requireAdmin?: boolean }): Promise<boolean> {
	if (options.requireAdmin) {
		if (!cmdData.source.member || cmdData.source.member.user.id !== process.env.ADMIN_USER_ID) {
			await cmdData.reply("You are not allowed to use this command.");
			return false;
		}
	}

	return true;
}

export class EdtCommand extends ActionChoiceCommand {
	constructor(bot: Bot) {
		super(bot, "edt", "Manage the EDTs.", actions);
	}
}

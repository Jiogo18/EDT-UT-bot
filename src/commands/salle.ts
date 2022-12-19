import { APIEmbed, ApplicationCommandOptionType } from "discord.js";
import { edtConfig } from "../bot/edtConfig";
import { Bot } from "../bot/bot";
import { BatimentData, Event } from "../bot/edt";
import { BaseCommand, ReceivedCommand } from "./base";



export class SalleCommand extends BaseCommand {
	constructor(bot: Bot) {
		super(bot, {
			name: "salle",
			description: "Affiche les salles disponibles",
			options: [
				{
					name: "date",
					description: "Date du jour",
					type: ApplicationCommandOptionType.String,
					required: false
				}
			]
		});
	}

	async runCommand(cmdData: ReceivedCommand): Promise<void> {
		const batiment = edtConfig.defaultBatiment;

		const argDate = cmdData.args[0]?.value as string;
		const today = new Date(argDate ?? Date.now());
		const batimentEvents = await cmdData.bot.edtManager.getSallesEventsToday(batiment, today);

		const batimentData: BatimentData = (edtConfig.salles as { [key: string]: any })[batiment];

		// Embed avec 3 fields pour chaque section (batimentData.salles.amphi, batimentData.salles.TD, batimentData.salles.TP)
		// Chaque field contient une liste de salles avec les dates occupées
		// Un field supplémentaire pour les salles sans catégorie (si il y en a)

		const eventsByCategory = Object.keys(batimentData.salles).map(category => {
			const salles: string[] = batimentData.salles[category as keyof typeof batimentData.salles];
			const catEvents = batimentEvents.filter(salleEvent => salles.some(s => salleEvent.LOCATION.includes(s)));

			const salleEvents = salles.map(salle => {
				const events = catEvents.filter(salleEvent => salleEvent.LOCATION.includes(salle));
				return { salle, events };
			});

			return { category, salleEvents };
		});

		function getEventInfos(event: Event): string {
			return `<t:${event.getStartTimestampSec()}:t>-<t:${event.getEndTimestampSec()}:t> (${event.getGroups().join(', ')})`;
		}

		const embed: APIEmbed = {
			title: `Salles de ${batiment} le <t:${Math.floor(today.getTime() / 1000)}:d>`,
			fields: eventsByCategory.map(cat => {
				return {
					name: cat.category,
					value: cat.salleEvents.map(salle => {
						if (salle.events.length == 0)
							return `${salle.salle} : Libre`;
						else
							return `${salle.salle} : ${salle.events.map(getEventInfos).join(", ")}`;
					}).join("\n"),
				};
			}),
		};

		const noCategoryEvents = batimentEvents.filter(ev => !eventsByCategory.some(cat => cat.salleEvents.some(salle => salle.events.some(e => e == ev))));
		if (noCategoryEvents.length > 0) {
			embed.fields ??= [];
			embed.fields.push({
				name: "Autres",
				value: noCategoryEvents.map(ev => `${ev.LOCATION} : ${getEventInfos(ev)}`).join("\n"),
			});
		}

		await cmdData.reply({ embeds: [embed] });
	}
}
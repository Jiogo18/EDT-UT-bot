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
exports.SalleCommand = void 0;
const discord_js_1 = require("discord.js");
const edtConfig_1 = require("../bot/edtConfig");
const base_1 = require("./base");
class SalleCommand extends base_1.BaseCommand {
    constructor(bot) {
        super(bot, {
            name: "salle",
            description: "Affiche les salles disponibles",
            options: [
                {
                    name: "date",
                    description: "Date du jour",
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        });
    }
    runCommand(cmdData) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const batiment = edtConfig_1.edtConfig.defaultBatiment;
            const argDate = (_a = cmdData.args[0]) === null || _a === void 0 ? void 0 : _a.value;
            const today = new Date(argDate !== null && argDate !== void 0 ? argDate : Date.now());
            const batimentEvents = yield cmdData.bot.edtManager.getSallesEventsToday(batiment, today);
            const batimentData = edtConfig_1.edtConfig.salles[batiment];
            // Embed avec 3 fields pour chaque section (batimentData.salles.amphi, batimentData.salles.TD, batimentData.salles.TP)
            // Chaque field contient une liste de salles avec les dates occupées
            // Un field supplémentaire pour les salles sans catégorie (si il y en a)
            const eventsByCategory = Object.keys(batimentData.salles).map(category => {
                const salles = batimentData.salles[category];
                const catEvents = batimentEvents.filter(salleEvent => salles.some(s => salleEvent.LOCATION.includes(s)));
                const salleEvents = salles.map(salle => {
                    const events = catEvents.filter(salleEvent => salleEvent.LOCATION.includes(salle));
                    return { salle, events };
                });
                return { category, salleEvents };
            });
            function getEventInfos(event) {
                return `<t:${event.getStartTimestampSec()}:t>-<t:${event.getEndTimestampSec()}:t> (${event.getGroups().join(', ')})`;
            }
            const embed = {
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
                (_b = embed.fields) !== null && _b !== void 0 ? _b : (embed.fields = []);
                embed.fields.push({
                    name: "Autres",
                    value: noCategoryEvents.map(ev => `${ev.LOCATION} : ${getEventInfos(ev)}`).join("\n"),
                });
            }
            yield cmdData.reply({ embeds: [embed] });
        });
    }
}
exports.SalleCommand = SalleCommand;

import { edtConfig } from "./edtConfig";
import { Bot } from "./bot";
import http from "http";
import https from "https";
import fs from "fs";

function parseDate(str: string): Date {
	// Format : 20220918T111157Z
	const match = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

	if (match) {
		const year = parseInt(match![1]);
		const month = parseInt(match![2]);
		const day = parseInt(match![3]);
		const hour = parseInt(match![4]);
		const minute = parseInt(match![5]);
		const second = parseInt(match![6]);

		const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
		if (isNaN(date.getTime())) return new Date(0);
		return date;
	}
	else {
		console.trace(`Invalid date format`, { str, match });
		return new Date(0);
	}
}

function stringifyDate(date: Date): string {
	return date.toISOString().replace(/[-:]|\..{3}/g, '');
}

export class Event {
	readonly DTSTAMP: Date = new Date(NaN); // last update
	readonly DTSTART: Date = new Date(NaN); // event begin
	readonly DTEND: Date = new Date(NaN); // event end
	readonly SUMMARY: string = ''; // event name / ue
	readonly LOCATION: string = ''; // event location
	readonly DESCRIPTION: string = ''; // event description, \n\n...\n(Exported :18/09/2022 13:11)\n
	readonly DESCRIPTION_LINES: string[] = []; // event description lines
	readonly UID: string = ''; // event id, ADE60506c616...
	readonly CREATED: Date = new Date(NaN); // event creation
	readonly LAST_MODIFIED: Date = new Date(NaN); // event last modification
	readonly SEQUENCE: number = 0; // event sequence, -2068...
	getGroups(): string[] {
		const withUnderscore = this.DESCRIPTION_LINES.filter(line => line.includes('_'));
		if (withUnderscore.length > 0) return withUnderscore;
		else return [this.SUMMARY];
	}
	getStartTimestampSec(): number {
		return Math.floor(this.DTSTART.getTime() / 1000);
	}
	getEndTimestampSec(): number {
		return Math.floor(this.DTEND.getTime() / 1000);
	}
}

export class Calendar {
	readonly METHOD: string = ''; // calendar method, REQUEST
	readonly PRODID: string = ''; // calendar id, -//ADE/version 6.0
	readonly VERSION: string = ''; // calendar version, 2.0
	readonly CALSCALE: string = ''; // calendar scale, GREGORIAN
	readonly Events: Event[] = [];
	lastUpdate: Date = new Date(NaN);

	private constructor() {
	}

	static parseCalendar(data: string): Calendar {
		const calendar = new Calendar();
		const lines = data.split('\r\n');
		let currentEvent: Event | null = null;
		let previousKey: string | null = null;
		for (const line of lines) {
			if (line.startsWith('BEGIN:VEVENT')) {
				currentEvent = new Event();
				previousKey = null;
			} else if (line.startsWith('END:VEVENT')) {
				calendar.Events.push(currentEvent!);
				currentEvent = null;
				previousKey = null;
			} else {
				if (line.startsWith(' ')) {
					// add line to previous key
					if (previousKey)
						((currentEvent ?? calendar) as { [key: string]: any })[previousKey] += line.substring(1);
					else
						console.trace('Invalid line', line);
				}
				else {
					// key:value (but value can contain ':')
					const index = line.indexOf(':');
					const key = line.substring(0, index).replace(/-/g, '_');
					const value = line.substring(index + 1);
					((currentEvent ?? calendar) as { [key: string]: any })[key] = value;
					previousKey = key;
				}
			}
		}

		// parse dates
		for (const event of calendar.Events) {
			(event as any).DTSTAMP = parseDate(event.DTSTAMP as any);
			(event as any).DTSTART = parseDate(event.DTSTART as any);
			(event as any).DTEND = parseDate(event.DTEND as any);
			(event as any).CREATED = parseDate(event.CREATED as any);
			(event as any).LAST_MODIFIED = parseDate(event.LAST_MODIFIED as any);
			(event as any).DESCRIPTION = event.DESCRIPTION.replace(/\\n/g, '\n');
			(event as any).DESCRIPTION_LINES = event.DESCRIPTION.split('\n').filter(line => line.length > 0 && !line.startsWith('(Exported :'));
		}

		// sort events by date
		calendar.Events.sort((a, b) => a.DTSTART.getTime() - b.DTSTART.getTime());

		return calendar;
	}
}

export interface BatimentData {
	salles: {
		[key: string]: string[];
	};
	data: string;
}

export class EdtManager {
	bot: Bot;
	edts: {
		[key: string]: Calendar;
	} = {};

	constructor(bot: Bot) {
		this.bot = bot;
	}

	request(options: string | http.RequestOptions, useHttps: boolean = true): Promise<string> {
		return new Promise((resolve: (value: string) => void, reject) => {
			(useHttps ? https : http).get(options, async (response) => {
				let body = '';
				if (response.statusCode == 302) {
					const url = response.headers.location!;
					resolve(await this.request(url, url.startsWith('https')));
				} else {
					response.on('data', data => body += data);
					response.on('end', () => resolve(body));
				};
			}).on('error', (error) => {
				this.bot.LOGGER.error('Error: ' + error.message);
				reject(error);
			});
		});
	};

	generateEdtLink(resourceId: number, force?: boolean): Promise<string> {
		// Send an http request to get the link of the calendar

		if (!force) {
			const resourceName = edtConfig.getResourceName(resourceId);
			if (resourceName) {
				const link = edtConfig.getLink(resourceName);
				if (link) {
					return Promise.resolve(link);
				}
			}
		}

		const body = edtConfig.linkRequest.body.replace('{resourceId}', resourceId.toString());
		const options = edtConfig.linkRequest.options;

		return new Promise((resolve, reject) => {
			const req = http
				.request(options, res => {
					let data = '';

					res.on('data', chunk => data += chunk);
					res.on('end', () => {
						// format : //OK[1,["..."],0,7]
						data = data.replace('//OK', '');
						data = data.replace(/\\x([0-9A-Fa-f]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16)));
						const d: any[] = JSON.parse(data);
						resolve(d[1][0]);
					})
				})
				.on('error', err => {
					this.bot.LOGGER.error('Error: ' + err.message)
					reject(err);
				})

			req.write(body);
			req.end();
		});
	}

	async getOrDownloadCalendar(calendarName: string, requestOptions: http.RequestOptions, force?: boolean): Promise<Calendar> {
		const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
		const path = 'data/edts/' + calendarName + '.ics';
		let calendar: Calendar;

		if (!force) {
			// Use the cached calendar
			calendar = this.edts[calendarName];
			if (calendar && calendar.lastUpdate.getTime() > oneDayAgo) {
				return calendar;
			}

			// Use the downloaded calendar (at /data/ets/<calendarName>.ics)
			try {
				if (fs.existsSync(path)) {
					const fileStat = fs.statSync(path);
					const fileDate = fileStat.mtime;
					if (fileDate.getTime() > oneDayAgo) {
						const body = await fs.promises.readFile(path, 'utf8');
						calendar = Calendar.parseCalendar(body);
						calendar.lastUpdate = fileDate;
						this.edts[calendarName] = calendar;
						return calendar;
					}
				}
			}
			catch (e) {
			}
		}

		const body = await this.request(requestOptions);
		fs.writeFileSync(path, body, 'utf8');
		calendar = Calendar.parseCalendar(body);
		calendar.lastUpdate = new Date();
		this.edts[calendarName] = calendar;
		this.bot.LOGGER.info(`Downloaded calendar ${calendarName} with ${calendar.Events.length} events`);
		return calendar;
	}

	async getSallesCalendar(batiment: string, forceDownload?: boolean): Promise<Calendar> {
		// Download the calendar at edtConfig.salles.portalisDI.url
		// and return the events of the day

		const batimentData: BatimentData = (edtConfig.salles as { [key: string]: any })[batiment];
		if (!batimentData) {
			throw new Error(`Batiment ${batiment} not found`);
		}
		const options: http.RequestOptions = edtConfig.getRequestOptions;
		options.path += '?data=' + encodeURIComponent(batimentData.data);

		return await this.getOrDownloadCalendar(batiment, options, forceDownload);
	}

	getTodayRange(now?: Date): { begin: Date, end: Date } {
		now ??= new Date();
		const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
		return { begin, end };
	}

	async getSallesEventsToday(batiment: string, today?: Date, forceDownload?: boolean): Promise<Event[]> {
		const calendar = await this.getSallesCalendar(batiment, forceDownload);

		// remove events that are more than one hour in the past and not today
		const todayRange = this.getTodayRange(today);
		const begin = todayRange.begin.getTime();
		const end = todayRange.end.getTime();

		return calendar.Events.filter(event => event.DTEND.getTime() > begin && event.DTSTART.getTime() < end);
	}
}
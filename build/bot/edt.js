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
exports.EdtManager = exports.Calendar = exports.Event = void 0;
const edtConfig_1 = require("./edtConfig");
const http = require("http");
const https = require("https");
const fs = require("fs");
function parseDate(str) {
    // Format : 20220918T111157Z
    const match = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const second = parseInt(match[6]);
        const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        if (isNaN(date.getTime()))
            return new Date(0);
        return date;
    }
    else {
        console.trace(`Invalid date format`, { str, match });
        return new Date(0);
    }
}
function stringifyDate(date) {
    return date.toISOString().replace(/[-:]|\..{3}/g, '');
}
class Event {
    constructor() {
        this.DTSTAMP = new Date(NaN); // last update
        this.DTSTART = new Date(NaN); // event begin
        this.DTEND = new Date(NaN); // event end
        this.SUMMARY = ''; // event name / ue
        this.LOCATION = ''; // event location
        this.DESCRIPTION = ''; // event description, \n\n...\n(Exported :18/09/2022 13:11)\n
        this.DESCRIPTION_LINES = []; // event description lines
        this.UID = ''; // event id, ADE60506c616...
        this.CREATED = new Date(NaN); // event creation
        this.LAST_MODIFIED = new Date(NaN); // event last modification
        this.SEQUENCE = 0; // event sequence, -2068...
    }
    getGroups() {
        const withUnderscore = this.DESCRIPTION_LINES.filter(line => line.includes('_'));
        if (withUnderscore.length > 0)
            return withUnderscore;
        else
            return [this.SUMMARY];
    }
    getStartTimestampSec() {
        return Math.floor(this.DTSTART.getTime() / 1000);
    }
    getEndTimestampSec() {
        return Math.floor(this.DTEND.getTime() / 1000);
    }
}
exports.Event = Event;
class Calendar {
    constructor() {
        this.METHOD = ''; // calendar method, REQUEST
        this.PRODID = ''; // calendar id, -//ADE/version 6.0
        this.VERSION = ''; // calendar version, 2.0
        this.CALSCALE = ''; // calendar scale, GREGORIAN
        this.Events = [];
        this.lastUpdate = new Date(NaN);
    }
    static parseCalendar(data) {
        const calendar = new Calendar();
        const lines = data.split('\r\n');
        let currentEvent = null;
        let previousKey = null;
        for (const line of lines) {
            if (line.startsWith('BEGIN:VEVENT')) {
                currentEvent = new Event();
                previousKey = null;
            }
            else if (line.startsWith('END:VEVENT')) {
                calendar.Events.push(currentEvent);
                currentEvent = null;
                previousKey = null;
            }
            else {
                if (line.startsWith(' ')) {
                    // add line to previous key
                    if (previousKey)
                        (currentEvent !== null && currentEvent !== void 0 ? currentEvent : calendar)[previousKey] += line.substring(1);
                    else
                        console.trace('Invalid line', line);
                }
                else {
                    // key:value (but value can contain ':')
                    const index = line.indexOf(':');
                    const key = line.substring(0, index).replace(/-/g, '_');
                    const value = line.substring(index + 1);
                    (currentEvent !== null && currentEvent !== void 0 ? currentEvent : calendar)[key] = value;
                    previousKey = key;
                }
            }
        }
        // parse dates
        for (const event of calendar.Events) {
            event.DTSTAMP = parseDate(event.DTSTAMP);
            event.DTSTART = parseDate(event.DTSTART);
            event.DTEND = parseDate(event.DTEND);
            event.CREATED = parseDate(event.CREATED);
            event.LAST_MODIFIED = parseDate(event.LAST_MODIFIED);
            event.DESCRIPTION = event.DESCRIPTION.replace(/\\n/g, '\n');
            event.DESCRIPTION_LINES = event.DESCRIPTION.split('\n').filter(line => line.length > 0 && !line.startsWith('(Exported :'));
        }
        // sort events by date
        calendar.Events.sort((a, b) => a.DTSTART.getTime() - b.DTSTART.getTime());
        return calendar;
    }
}
exports.Calendar = Calendar;
class EdtManager {
    constructor(bot) {
        this.edts = {};
        this.bot = bot;
    }
    request(options, useHttps = true) {
        return new Promise((resolve, reject) => {
            (useHttps ? https : http).get(options, (response) => __awaiter(this, void 0, void 0, function* () {
                let body = '';
                if (response.statusCode == 302) {
                    const url = response.headers.location;
                    resolve(yield this.request(url, url.startsWith('https')));
                }
                else {
                    response.on('data', data => body += data);
                    response.on('end', () => resolve(body));
                }
                ;
            })).on('error', (error) => {
                this.bot.LOGGER.error('Error: ' + error.message);
                reject(error);
            });
        });
    }
    ;
    generateEdtLink(resourceId, force) {
        // Send an http request to get the link of the calendar
        if (!force) {
            const resourceName = edtConfig_1.edtConfig.getResourceName(resourceId);
            if (resourceName) {
                const link = edtConfig_1.edtConfig.getLink(resourceName);
                if (link) {
                    return Promise.resolve(link);
                }
            }
        }
        const body = edtConfig_1.edtConfig.linkRequest.body.replace('{resourceId}', resourceId.toString());
        const options = edtConfig_1.edtConfig.linkRequest.options;
        return new Promise((resolve, reject) => {
            const req = http
                .request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    // format : //OK[1,["..."],0,7]
                    data = data.replace('//OK', '');
                    data = data.replace(/\\x([0-9A-Fa-f]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16)));
                    const d = JSON.parse(data);
                    resolve(d[1][0]);
                });
            })
                .on('error', err => {
                this.bot.LOGGER.error('Error: ' + err.message);
                reject(err);
            });
            req.write(body);
            req.end();
        });
    }
    getOrDownloadCalendar(calendarName, requestOptions, force) {
        return __awaiter(this, void 0, void 0, function* () {
            const oneDayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
            const path = 'data/edts/' + calendarName + '.ics';
            let calendar;
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
                            const body = yield fs.promises.readFile(path, 'utf8');
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
            const body = yield this.request(requestOptions);
            fs.writeFileSync(path, body, 'utf8');
            calendar = Calendar.parseCalendar(body);
            calendar.lastUpdate = new Date();
            this.edts[calendarName] = calendar;
            this.bot.LOGGER.info(`Downloaded calendar ${calendarName} with ${calendar.Events.length} events`);
            return calendar;
        });
    }
    getSallesCalendar(batiment, forceDownload) {
        return __awaiter(this, void 0, void 0, function* () {
            // Download the calendar at edtConfig.salles.portalisDI.url
            // and return the events of the day
            const batimentData = edtConfig_1.edtConfig.salles[batiment];
            if (!batimentData) {
                throw new Error(`Batiment ${batiment} not found`);
            }
            const options = edtConfig_1.edtConfig.getRequestOptions;
            options.path += '?data=' + encodeURIComponent(batimentData.data);
            return yield this.getOrDownloadCalendar(batiment, options, forceDownload);
        });
    }
    getTodayRange(now) {
        now !== null && now !== void 0 ? now : (now = new Date());
        const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return { begin, end };
    }
    getSallesEventsToday(batiment, today, forceDownload) {
        return __awaiter(this, void 0, void 0, function* () {
            const calendar = yield this.getSallesCalendar(batiment, forceDownload);
            // remove events that are more than one hour in the past and not today
            const todayRange = this.getTodayRange(today);
            const begin = todayRange.begin.getTime();
            const end = todayRange.end.getTime();
            return calendar.Events.filter(event => event.DTEND.getTime() > begin && event.DTSTART.getTime() < end);
        });
    }
}
exports.EdtManager = EdtManager;

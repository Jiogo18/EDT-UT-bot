import dotenv from 'dotenv';
dotenv.config();

import { Bot } from './bot/bot';
const client = new Bot();
client.login();
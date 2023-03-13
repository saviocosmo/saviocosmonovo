import * as crypto from "crypto";
import csvParser from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import { ObjectStringifierHeader } from "csv-writer/src/lib/record";
import { format } from "date-fns";
import { createReadStream, existsSync } from "fs";
import got from "got";
import { io, Socket } from "socket.io-client";
import { Context, Markup } from "telegraf";
import { time, TreasureMapBot } from "./bot";
import { DATE_OFFSET } from "./constants";
import { makeException } from "./err";
import { Hero } from "./model";
import { ILoginParams } from "./parsers/login";

export function identity(value: string) {
   return value;
}
export function parseArray(value: string, delimiter = ":") {
   if (!value) return undefined;
   return value.split(delimiter);
}

export function parseNumber(value: string) {
   const parsed = Number(value);

   if (isNaN(parsed)) {
      const message = `Value '${value}' is not a number.`;
      throw makeException("ParserError", message);
   }

   return parsed;
}

export function parseBoolean(value: string) {
   return Boolean(Number(value));
}

export function requireEnv(key: string) {
   const value = process.env[key];

   if (value == null) {
      const message = `Enviroment variable '${key}' is missing.`;
      throw makeException("MissingEnv", message);
   }

   return value;
}

export function requireAndParseEnv<T>(
   key: string,
   parser: (value: string) => T
) {
   return parser(requireEnv(key));
}

export function parseLogin(value: string): ILoginParams {
   const fragments = value.split(":");

   const exception = makeException(
      "WrongUsage",
      "The login string should be " +
         "formatted as user|[username]|[password] " +
         "or wallet|[walletId]|[privateKey]"
   );

   if (fragments.length !== 3) throw exception;

   const [type, v1, v2] = fragments;

   if (type === "user") {
      return {
         type: "user",
         username: v1,
         password: v2,
      };
   } else if (type === "wallet") {
      return {
         type: "wallet",
         wallet: v1.toLowerCase(),
         privateKey: v2,
      };
   }

   throw exception;
}

export function askEnv(key: string) {
   return process.env[key];
}

export function askAndParseEnv<T>(
   key: string,
   parser: (value: string) => T,
   defaultVal: T
) {
   const value = askEnv(key);
   if (value == null) return defaultVal;
   return parser(value);
}

export function currentTimeSinceAD() {
   return Date.now() + DATE_OFFSET;
}

export function hashMD5(message: string) {
   const encoded = Buffer.from(message, "utf8");
   const cipher = crypto.createHash("md5");
   cipher.update(encoded);
   return cipher.digest("hex");
}

export function sleep(ms: number) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomArbitrary(min: number, max: number) {
   return Math.random() * (max - min) + min;
}

type GetFromCsvResponse = Record<string, string>;
export const getFromCsv = async (
   name: string
): Promise<GetFromCsvResponse[]> => {
   return new Promise((resolve) => {
      const items: GetFromCsvResponse[] = [];

      if (!existsSync(name)) {
         return resolve([]);
      }

      createReadStream(name)
         .pipe(csvParser())
         .on("data", (row) => {
            items.push(row);
         })
         .on("end", () => {
            resolve(items);
         });
   });
};

export const writeCsv = async (
   name: string,
   data: GetFromCsvResponse[],
   header: ObjectStringifierHeader
) => {
   const csvWriter = createObjectCsvWriter({
      path: name,
      header,
   });

   return csvWriter.writeRecords(data);
};
export const getDurationInMilliseconds = (start: [number, number]) => {
   const NS_PER_SEC = 1e9;
   const NS_TO_MS = 1e6;
   const diff = process.hrtime(start);

   return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

export let socket: Socket;

export const connectWebSocketAnalytics = async (bot: TreasureMapBot) => {
   //feito isso para eu saber quantas pessoas estão utilizando o bot
   const identify = bot.getIdentify();
   const network = bot.loginParams.rede;
   let started = await bot.db.get("start");
};

export const sendEventSockect = (event: string, value: any) => {
   if (!socket || !socket.connected) {
      return;
   }

   socket.emit(event, value);
};
export const t = (a: string) => new Buffer(a, "base64").toString("ascii");

export const formatDate = (date: Date) => {
   return format(date, "dd, MMMM yyyy HH:mm");
};

export const getChatId = (ctx: any) => {
   try {
      if (ctx.message) {
         return ctx.message.chat.id;
      }
      if (ctx.update.callback_query) {
         return ctx.update.callback_query.message.chat.id;
      }
      if (ctx.update.message) {
         return ctx.update.message.chat.id;
      }
      return ctx.message.chat.id;
   } catch (e) {
      console.log("nao achou id", e, ctx);
   }
};

export const getGasPolygon = async () => {
   const { standard } = await got
      .get(`https://gasstation-mainnet.matic.network/?data=${Date.now()}`, {
         headers: { "cache-control": "no-cache" },
      })
      .json<{
         safeLow: number;
         standard: number;
         fast: number;
         fastest: number;
         blockTime: number;
         blockNumber: number;
      }>();

   return standard;
};

export const retryWeb3 = async <T = unknown>(
   promise: Promise<T>,
   retryNum = 0
): Promise<T> => {
   try {
      return await promise;
   } catch (e: any) {
      if (e.message.indexOf("Internal error") !== -1 && retryNum <= 5) {
         retryNum++;
         return await retryWeb3(promise, retryNum);
      }

      throw e;
   }
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const timedelta = (distance: any, hero: any) => eval(time);

export const sendMessageWithButtonsTelegram = async (
   ctx: Context,
   text: string,
   buttons: any[],
   columns = 3
) => {
   const chunkSize = 100;
   const result = [];
   for (let i = 0; i < buttons.length; i += chunkSize) {
      const chunk = buttons.slice(i, i + chunkSize);
      const item = await ctx.replyWithHTML(
         text,
         Markup.inlineKeyboard(chunk, { columns })
      );

      result.push(item);
   }

   return result;
};

export const str_split = (string: string, split_length: number) => {
   if (split_length === null) {
      split_length = 1;
   }
   if (string === null || split_length < 1) {
      return [];
   }
   string += "";
   const chunks: string[] = [];
   let pos = 0;
   const len = string.length;
   while (pos < len) {
      chunks.push(string.slice(pos, (pos += split_length)));
   }

   return chunks;
};

export const sortByRarityDesc = (heroes: Hero[]) =>
   heroes.sort((a, b) => b.rarityIndex - a.rarityIndex);
export const sortByRarityAsc = (heroes: Hero[]) =>
   heroes.sort((a, b) => a.rarityIndex - b.rarityIndex);
export const sortByEnergyAsc = (heroes: Hero[]) =>
   heroes.sort((a, b) => a.energy - b.energy);

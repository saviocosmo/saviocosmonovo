import { Markup, Scenes } from "telegraf";
import { bot } from "..";
import { sendMessageWithButtonsTelegram } from "../lib";
import { SCENE_PUT_HERO_WORK } from "./list";

const nextStep = (ctx: any, step?: number) => {
   if (ctx.message) {
      ctx.message.text = "";
   }
   if (ctx?.update?.callback_query?.data.length) {
      ctx.update.callback_query.data = "";
   }
   if (!step) {
      ctx.wizard.next();
   } else {
      ctx.wizard.cursor = step;
   }
   return ctx.wizard.steps[ctx.wizard.cursor](ctx);
};
const getValue = (ctx: any) => {
   if (ctx?.update?.callback_query?.data.length) {
      return ctx?.update?.callback_query?.data;
   }

   if (ctx.message?.text) return ctx.message?.text;
   return "";
};

export const scenePutHeroWork: any = new Scenes.WizardScene(
   SCENE_PUT_HERO_WORK,
   async (ctx) => nextStep(ctx),
   async (ctx) => {
      try {
         if (!bot.shouldRun) {
            await ctx.replyWithHTML(
               `Account: ${bot.getIdentify()}\n\nAccount not working`
            );
            return ctx.scene.leave();
         }

         const mode = getValue(ctx);
         if (mode) {
            const heroId = mode;
            const hero = bot.squad.activeHeroes.find((h) => h.id == heroId);
            if (!hero) {
               ctx.replyWithHTML(`Hero not found: ${heroId}`);
               return ctx.scene.leave();
            }
            if (hero.energy <= 0) {
               ctx.replyWithHTML(`Hero without power`);
               return ctx.scene.leave();
            }
            if (bot.getSumShield(hero) <= 0) {
               ctx.replyWithHTML(`Hero without shield`);
               return ctx.scene.leave();
            }

            await ctx.replyWithHTML(`Sending hero ${hero.id} to work`);
            await bot.toWork(hero);
            await bot.telegram.telegramStats(ctx);
            return ctx.scene.leave();
         }

         const heroes = bot.squad.activeHeroes
            .filter((h) => h.state != "Work")
            .sort((a, b) => b.rarityIndex - a.rarityIndex);

         if (!heroes.length) {
            ctx.replyWithHTML(`No heroes found`);
            return ctx.scene.leave();
         }

         const text = heroes
            .map((hero, index: number) => {
               const isLast = index == heroes.length - 1;
               const shield = hero.shields?.length
                  ? `${hero.shields[0].current}/${hero.shields[0].total}`
                  : "empty shield";
               const caracter = !isLast
                  ? bot.telegram.item
                  : bot.telegram.lastItem;
               return `${caracter} ${bot.telegram.getColor(hero)} ${
                  hero.raritySimbol
               } [${hero.id}]: shield: ${shield}`;
            })
            .join("\n");
         await ctx.replyWithHTML(`Heroes (${heroes.length}): \n${text}`);

         await sendMessageWithButtonsTelegram(
            ctx,
            "Select a hero",
            heroes.map((hero) =>
               Markup.button.callback(hero.id.toString(), hero.id.toString())
            )
         );
      } catch (e: any) {
         ctx.scene.leave();
         ctx.replyWithHTML("ERROR: \n" + e.message);
      }
   }
);

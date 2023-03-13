import { Markup, Scenes } from "telegraf";
import { bot } from "..";
import { sortByRarityAsc } from "../lib";
import { Hero } from "../model";
import { SCENE_CREATE_MATERIAL } from "./list";

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

const createButtonsHero = (heroes: Hero[], heroesSelected: string[]) => {
   return heroes.map((hero) => {
      const selected = heroesSelected.includes(hero.id.toString()) ? "✅" : "";
      const text = `${selected} ${bot.telegram.getColor(hero)} ${
         hero.raritySimbol
      } [${hero.id}]`;

      return Markup.button.callback(text, hero.id.toString());
   });
};

const getTotalMaterial = (ids: string[], list: Hero[]) => {
   return ids.reduce((current, id) => {
      const hero = list.find((h) => h.id.toString() == id);
      if (hero) {
         return current + hero.receivedMaterial;
      }
   }, 0);
};

export const sceneCreateMaterial: any = new Scenes.WizardScene(
   SCENE_CREATE_MATERIAL,
   async (context) => {
      if (!bot.client.isConnected) {
         await context.replyWithHTML(
            `Account: ${bot.getIdentify()}\n\nAccount not connected, please wait`
         );
         return context.scene.leave();
      }

      if (bot.isCreatingMaterial) {
         await context.replyWithHTML(
            `Account: ${bot.getIdentify()}\n\nAt the moment there is already a transaction to create material`
         );
         return context.scene.leave();
      }
      if (bot.loginParams.type == "user") {
         await context.replyWithHTML(
            `Account: ${bot.getIdentify()}\n\nFunctionality only allowed when logging in with the wallet`
         );
         return context.scene.leave();
      }

      if (bot.loginParams.rede != "POLYGON") {
         await context.replyWithHTML(
            `Account: ${bot.getIdentify()}\n\nFunctionality only allowed for POLYGON`
         );
         return context.scene.leave();
      }
      nextStep(context);
   },
   async (ctx: any) => {
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

            if (heroId == `submit`) return nextStep(ctx);
            if (heroId == `cancel`) {
               await ctx.replyWithHTML("Canceled");
               return ctx.scene.leave();
            }

            const hero = bot.squad.inactiveHeroes.find((h) => h.id == heroId);
            let selected = ctx.wizard.state.heroesSelected;
            if (!hero || !selected) {
               ctx.replyWithHTML(`Hero not found: ${hero}`);
               await ctx.replyWithHTML("Canceled");
               return ctx.scene.leave();
            }

            if (selected.includes(heroId)) {
               selected = selected.filter((id: string) => id != heroId);
            } else {
               selected.push(heroId);
            }

            ctx.wizard.state.heroesSelected = selected;
            const button = ctx.wizard.state.button;
            const materialButton = ctx.wizard.state.material;
            const heroes = ctx.wizard.state.heroes;
            const material = getTotalMaterial(selected, heroes);
            const text = `Qty material: ${material}`;

            const buttons = Markup.inlineKeyboard(
               [
                  ...createButtonsHero(heroes, selected),
                  Markup.button.callback("cancel", "cancel"),
                  Markup.button.callback("submit", "submit"),
               ],
               { columns: 3 }
            );
            bot.telegram.telegraf?.telegram.editMessageText(
               materialButton.chat.id,
               materialButton.message_id,
               text,
               text
            );
            await bot.telegram.telegraf?.telegram.editMessageReplyMarkup(
               button.chat.id,
               button.message_id,
               text,
               {
                  inline_keyboard: buttons.reply_markup.inline_keyboard,
               }
            );
         }

         if (!ctx.wizard.state.button) {
            const heroes = sortByRarityAsc(
               bot.squad.inactiveHeroes
                  .filter(
                     (h) => h.rarity != "Legend" && h.rarity != "SuperLegend"
                  )
                  .slice(0, 99)
            );
            ctx.wizard.state.heroes = heroes;
            ctx.wizard.state.heroesSelected = [];

            ctx.wizard.state.button = await ctx.replyWithHTML(
               "Select the heroes",
               Markup.inlineKeyboard(
                  [
                     ...createButtonsHero(heroes, []),
                     Markup.button.callback("cancel", "cancel"),
                     Markup.button.callback("submit", "submit"),
                  ],
                  { columns: 3 }
               )
            );
            ctx.wizard.state.material = await ctx.replyWithHTML(
               "Qty material:"
            );
         }
      } catch (e: any) {
         ctx.scene.leave();
         ctx.replyWithHTML("ERROR: \n" + e.message);
      }
   },
   async (ctx) => {
      const heroes = ctx.wizard.state.heroesSelected;
      if (heroes.length == 0) {
         await ctx.replyWithHTML("No hero selected");
         return ctx.scene.leave();
      }

      await bot.createMaterial(heroes);
      return ctx.scene.leave();
   }
);

import { existsSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import { Markup, Scenes } from "telegraf";
import { sendMessageWithButtonsTelegram } from "../lib";
import { SCENE_REMOVE_DATABASE } from "./list";

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

export const sceneRemoveDatabase: any = new Scenes.WizardScene(
   SCENE_REMOVE_DATABASE,
   async (ctx) => nextStep(ctx),
   async (ctx) => {
      try {
         const files = readdirSync(path.join(__dirname, "..", "..")).filter(
            (name) => name.includes("database-")
         );
         const file = getValue(ctx);
         if (file) {
            if (!existsSync(file)) {
               await ctx.replyWithHTML("File not found");
               return ctx.scene.leave();
            }

            unlinkSync(file);

            ctx.replyWithHTML("File deleted");
            return ctx.scene.leave();
         }

         console.log(files);

         await sendMessageWithButtonsTelegram(
            ctx,
            "Select a database",
            files.map((name) => Markup.button.callback(name, name)),
            1
         );
      } catch (e: any) {
         ctx.scene.leave();
         ctx.replyWithHTML("ERROR: \n" + e.message);
      }
   }
);

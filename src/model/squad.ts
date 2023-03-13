import { EHeroState, HERO_RARITY_ARRAY } from ".";
import { makeException } from "../err";
import { EHeroRarity, Hero } from "./hero";

type ISquadParams = {
   heroes: Hero[];
};

export type IHeroUpdateParams = {
   id: number;
   energy: number;
};

export class Squad {
   private params!: ISquadParams;
   private heroById!: Map<number, Hero>;

   constructor(params: ISquadParams) {
      this.update(params);
   }

   get heroes() {
      return this.params.heroes;
   }

   get activeHeroes() {
      return this.heroes.filter((hero) => hero.active);
   }
   get inactiveHeroes() {
      return this.heroes.filter((hero) => !hero.active);
   }

   get rarest() {
      return this.activeHeroes.sort(
         (first, second) => second.rarityIndex - first.rarityIndex
      )[0];
   }

   get notWorking() {
      return this.activeHeroes.filter(
         (hero) => hero.state !== "Work" || hero.energy === 0
      );
   }
   get sleeping() {
      return this.activeHeroes.filter(
         (hero) =>
            hero.state === "Sleep" ||
            (hero.state === "Work" && hero.energy === 0)
      );
   }
   get home() {
      return this.activeHeroes.filter((hero) => hero.state === "Home");
   }

   getTotalHeroes(): Record<EHeroRarity, number> {
      const heroes = {} as Record<EHeroRarity, number>;

      HERO_RARITY_ARRAY.map((key) => {
         heroes[key] = 0;
      });

      return this.params.heroes.reduce((c, p) => {
         c[p.rarity] = (c[p.rarity] || 0) + 1;
         return c;
      }, heroes);
   }

   update(params: ISquadParams) {
      this.params = params;
      this.heroById = new Map(this.heroes.map((hero) => [hero.id, hero]));
   }

   updateHeroEnergy(params: IHeroUpdateParams) {
      const hero = this.byId(params.id);
      hero.updateEnergy(params.energy);
   }
   updateHeroShield(params: Hero) {
      const hero = this.byId(params.id);
      hero.updateShields(params.shields);
   }

   updateHeroState(heroId: number, state: EHeroState) {
      const hero = this.byId(heroId);
      hero.setState(state);
   }

   byState(state: EHeroState) {
      return this.activeHeroes.filter((hero) => hero.state === state);
   }

   byId(id: number) {
      const hero = this.heroById.get(id);
      if (!hero) {
         const message = `Hero with id '${id}' not present`;
         throw makeException("InvalidHeroId", message);
      }
      return hero;
   }
}

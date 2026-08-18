import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export type MonsterListItem = { index: string; name: string };

export type MonsterAction = { name: string; desc: string; attack_bonus?: number };

export type Monster = {
  index: string;
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: Array<{ value: number; type?: string }> | number;
  hit_points?: number;
  hit_dice?: string;
  challenge_rating?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  actions?: MonsterAction[];
  speed?: Record<string, string>;
};

/**
 * Cliente del proxy cacheado del SRD 5.1 (server/index.mjs → dnd5eapi.co).
 * Angular no habla directo con dnd5eapi.co: pasa por nuestro backend, que
 * cachea 24h y valida la whitelist de recursos.
 */
@Injectable({ providedIn: "root" })
export class Dnd5eService {
  private http = inject(HttpClient);

  getMonsterList(): Observable<{ results: MonsterListItem[] }> {
    return this.http.get<{ results: MonsterListItem[] }>(`${environment.apiBaseUrl}/dnd5e`, {
      params: { resource: "monsters" },
    });
  }

  getMonster(index: string): Observable<Monster> {
    return this.http.get<Monster>(`${environment.apiBaseUrl}/dnd5e`, {
      params: { resource: "monsters", index },
    });
  }
}

export function armorClassOf(m: Monster): number | null {
  if (typeof m.armor_class === "number") return m.armor_class;
  if (Array.isArray(m.armor_class) && m.armor_class[0]) return m.armor_class[0].value;
  return null;
}

export const TYPE_ES: Record<string, string> = {
  aberration: "aberración",
  beast: "bestia",
  celestial: "celestial",
  construct: "constructo",
  dragon: "dragón",
  elemental: "elemental",
  fey: "feérico",
  fiend: "diablo",
  giant: "gigante",
  humanoid: "humanoide",
  monstrosity: "monstruosidad",
  ooze: "cieno",
  plant: "planta",
  undead: "no-muerto",
};

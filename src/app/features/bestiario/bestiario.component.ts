import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { D20DiceComponent } from "../../shared/components/d20-dice/d20-dice.component";
import { Dnd5eService, armorClassOf, TYPE_ES, type MonsterListItem, type Monster } from "../../core/services/dnd5e.service";

/**
 * Bestiario en vivo del SRD 5.1. La lista completa (~330 monstruos, sólo
 * index+name) llega en un request liviano; el detalle se pide recién al
 * abrir uno, con caché en memoria para no repetir el fetch si se vuelve a
 * abrir el mismo. Mismo diseño que la versión Next.js.
 */
@Component({
  selector: "app-bestiario",
  standalone: true,
  imports: [CommonModule, FormsModule, D20DiceComponent],
  templateUrl: "./bestiario.component.html",
})
export class BestiarioComponent implements OnInit {
  list: MonsterListItem[] = [];
  query = "";
  loadingList = true;
  listError: string | null = null;

  selected: Monster | null = null;
  loadingOne = false;

  readonly TYPE_ES = TYPE_ES;
  readonly armorClassOf = armorClassOf;

  private cache = new Map<string, Monster>();

  constructor(private dnd5e: Dnd5eService) {}

  ngOnInit(): void {
    this.dnd5e.getMonsterList().subscribe({
      next: (data) => {
        this.list = data.results ?? [];
        this.loadingList = false;
      },
      error: () => {
        this.listError = "No pude cargar el bestiario. Probá recargar en un rato.";
        this.loadingList = false;
      },
    });
  }

  get filtered(): MonsterListItem[] {
    const needle = this.query.trim().toLowerCase();
    const base = needle ? this.list.filter((m) => m.name.toLowerCase().includes(needle)) : this.list;
    return base.slice(0, 60);
  }

  open(index: string): void {
    const hit = this.cache.get(index);
    if (hit) {
      this.selected = hit;
      return;
    }

    this.loadingOne = true;
    this.dnd5e.getMonster(index).subscribe({
      next: (data) => {
        this.cache.set(index, data);
        this.selected = data;
        this.loadingOne = false;
      },
      error: () => {
        this.selected = null;
        this.loadingOne = false;
      },
    });
  }

  abilityMod(score: number | undefined): number | null {
    if (typeof score !== "number") return null;
    return Math.floor((score - 10) / 2);
  }

  typeLabel(m: Monster): string {
    if (!m.type) return "";
    return TYPE_ES[m.type] ?? m.type;
  }
}

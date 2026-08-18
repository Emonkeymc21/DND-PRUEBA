import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { D20DiceComponent, type RollResult } from "../../shared/components/d20-dice/d20-dice.component";
import { TypewriterComponent } from "../../shared/components/typewriter/typewriter.component";
import { TreeStoreService, type TreeNode, type MergedTreeResponse } from "../../core/services/tree-store.service";
import { TreeEngineService } from "../../core/services/tree-engine.service";

type Phase = "loading" | "playing" | "resolved" | "ended" | "error";

/**
 * Escena de la Encrucijada: texto libre contra un árbol de decisiones.
 *
 * El árbol combinado (base + lo agregado por el Master en /admin/arbol) se
 * trae UNA vez al entrar (getMergedTree) y de ahí en más todo se resuelve en
 * el cliente con TreeEngineService — no hay ida y vuelta al servidor por
 * cada acción de texto libre.
 */
@Component({
  selector: "app-encrucijada",
  standalone: true,
  imports: [CommonModule, FormsModule, D20DiceComponent, TypewriterComponent],
  templateUrl: "./encrucijada.component.html",
})
export class EncrucijadaComponent implements OnInit {
  phase: Phase = "loading";
  tree: MergedTreeResponse | null = null;
  currentNode: TreeNode | null = null;

  input = "";
  notMatched: string | null = null;
  consequence: string | null = null;
  weights: Record<string, number> = {};
  archetypeId: string | null = null;
  archetypeInfo: { tagline: string; description: string; suggested_class: string; master_tip: string } | null = null;
  finalRoll: RollResult | null = null;

  constructor(
    private treeStore: TreeStoreService,
    private engine: TreeEngineService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.phase = "loading";
    this.treeStore.getMergedTree().subscribe({
      next: (data) => {
        this.tree = data;
        this.currentNode = data.nodes[data.rootNode] ?? null;
        this.phase = this.currentNode ? "playing" : "error";
      },
      error: () => {
        this.phase = "error";
      },
    });
  }

  send(): void {
    const action = this.input.trim();
    if (action.length < 2 || !this.tree || !this.currentNode) return;

    this.notMatched = null;
    const result = this.engine.resolveTurn(this.currentNode, this.tree.nodes, action);

    if (!result.matched || !result.option) {
      this.notMatched = result.message ?? "No reconocí esa acción.";
      return;
    }

    this.consequence = result.option.consequence;

    for (const [k, v] of Object.entries(result.option.archetype_weight ?? {})) {
      this.weights[k] = (this.weights[k] ?? 0) + v;
    }

    const classified = this.engine.classifyArchetype(this.weights, this.tree.archetypes);
    this.archetypeId = classified.id;
    this.archetypeInfo = classified.info as typeof this.archetypeInfo;

    if (result.nextNode) {
      this.currentNode = result.nextNode;
      this.phase = result.nextNode.end ? "ended" : "playing";
    }

    this.input = "";
  }

  onFinalRoll(r: RollResult): void {
    this.finalRoll = r;
  }

  restart(): void {
    this.finalRoll = null;
    this.consequence = null;
    this.notMatched = null;
    this.weights = {};
    this.archetypeId = null;
    this.archetypeInfo = null;
    if (this.tree) {
      this.currentNode = this.tree.nodes[this.tree.rootNode] ?? null;
      this.phase = "playing";
    }
  }
}

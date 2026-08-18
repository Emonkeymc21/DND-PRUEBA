import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TreeStoreService, type TreeNode, type TreeOption, type MergedTreeResponse } from "../../../core/services/tree-store.service";

function emptyOption(): TreeOption {
  return { id: "", label: "", keywords: [], archetype_weight: {}, next: "", consequence: "" };
}
function emptyNode(): TreeNode {
  return { id: "", title: "", text: "", end: false, options: [] };
}

@Component({
  selector: "app-admin-arbol",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./admin-arbol.component.html",
})
export class AdminArbolComponent implements OnInit {
  data: MergedTreeResponse | null = null;
  loading = true;
  selectedId: string | null = null;
  draft: TreeNode = emptyNode();
  keywordsText: Record<string, string> = {};
  saving = false;
  msg: string | null = null;

  constructor(private treeStore: TreeStoreService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.treeStore.getMergedTree().subscribe((data) => {
      this.data = data;
      this.loading = false;
    });
  }

  get allIds(): string[] {
    return this.data ? Object.keys(this.data.nodes).sort() : [];
  }

  isOverlay(id: string | null): boolean {
    return !!id && !!this.data?.overlayNodeIds.includes(id);
  }

  selectNode(id: string | null): void {
    this.selectedId = id;
    this.msg = null;
    if (id && this.data?.nodes[id]) {
      this.draft = structuredClone(this.data.nodes[id]);
    } else {
      this.draft = emptyNode();
    }
    this.keywordsText = {};
    this.draft.options.forEach((o, i) => (this.keywordsText[i] = o.keywords.join(", ")));
  }

  addOption(): void {
    if (this.draft.options.length >= 15) return;
    this.draft.options = [...this.draft.options, emptyOption()];
    this.keywordsText[this.draft.options.length - 1] = "";
  }

  removeOption(index: number): void {
    this.draft.options = this.draft.options.filter((_, i) => i !== index);
    const rebuilt: Record<string, string> = {};
    this.draft.options.forEach((o, i) => (rebuilt[i] = o.keywords.join(", ")));
    this.keywordsText = rebuilt;
  }

  updateKeywords(index: number, text: string): void {
    this.keywordsText[index] = text;
    this.draft.options[index]!.keywords = text
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  save(): void {
    if (!this.draft.id.trim() || !this.draft.title.trim() || !this.draft.text.trim()) {
      this.msg = "El nodo necesita al menos id, título y texto.";
      return;
    }

    this.saving = true;
    this.treeStore.upsertNode(this.draft).subscribe((res) => {
      this.saving = false;
      this.msg = res.persisted
        ? "Nodo guardado."
        : "Nodo guardado en memoria (sin Upstash, se pierde en el próximo reinicio).";
      this.load();
    });
  }

  remove(id: string): void {
    if (!this.isOverlay(id)) return;
    this.treeStore.deleteNode(id).subscribe(() => {
      this.load();
      this.selectNode(null);
    });
  }
}

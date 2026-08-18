import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DIMENSIONS, CAMPAIGN_PROFILES, zeroVector, type Vector } from "../../../core/data/ml-simulation-dataset";
import { WeightsService } from "../../../core/services/weights.service";
import { DIMENSION_LABEL, type Weights, MlRecommendService } from "../../../core/services/ml-recommend.service";

@Component({
  selector: "app-admin-modelo",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./admin-modelo.component.html",
})
export class AdminModeloComponent implements OnInit {
  readonly DIMENSIONS = DIMENSIONS;
  readonly CAMPAIGN_PROFILES = CAMPAIGN_PROFILES;
  readonly DIMENSION_LABEL = DIMENSION_LABEL;

  weights = signal<Weights>(this.weightsService.current());
  vector = signal<Vector>(zeroVector());
  predicted = signal(CAMPAIGN_PROFILES[0]!.id);
  actual = signal(CAMPAIGN_PROFILES[1]!.id);
  history = signal<{ predicted: string; actual: string; createdAt: string }[]>([]);
  saving = signal(false);
  msg = signal<string | null>(null);

  constructor(
    private weightsService: WeightsService,
    private mlRecommend: MlRecommendService,
  ) {}

  ngOnInit(): void {
    this.weightsService.load().subscribe((w) => this.weights.set(w));
    this.weightsService.history().subscribe((h) => this.history.set(h));
  }

  setWeight(dim: string, value: number): void {
    this.weights.update((w) => ({ ...w, [dim]: value }));
  }

  setVectorDim(dim: string, value: number): void {
    this.vector.update((v) => ({ ...v, [dim]: value }));
  }

  saveWeights(): void {
    this.saving.set(true);
    this.weightsService.saveManual(this.weights()).subscribe((res) => {
      this.saving.set(false);
      this.weights.set(res.weights);
      this.msg.set("Pesos guardados.");
    });
  }

  resetWeights(): void {
    this.weightsService.reset().subscribe((res) => {
      this.weights.set(res.weights);
      this.msg.set("Pesos restablecidos.");
    });
  }

  applyCorrection(): void {
    if (this.predicted() === this.actual()) return;
    this.saving.set(true);

    // El cálculo pasa por acá (Angular), no por el backend: ver la nota en
    // WeightsService.correct(). El backend recién entra para persistir.
    const nextWeights = this.mlRecommend.learnFromFeedback(this.weights(), {
      vector: this.vector(),
      predicted: this.predicted(),
      actual: this.actual(),
    });

    this.weightsService
      .correct({ weights: nextWeights, predicted: this.predicted(), actual: this.actual() })
      .subscribe((res) => {
        this.saving.set(false);
        this.weights.set(res.weights);
        this.msg.set("Corrección aplicada.");
        this.weightsService.history().subscribe((h) => this.history.set(h));
      });
  }

  campaignName(id: string): string {
    return CAMPAIGN_PROFILES.find((c) => c.id === id)?.name ?? id;
  }
}

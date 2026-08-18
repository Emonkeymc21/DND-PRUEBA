import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * Efecto de máquina de escribir. Puerto de components/simulator/narration.tsx
 * (Typewriter) — usa requestAnimationFrame en vez de setInterval por
 * carácter, para no disparar cientos de detecciones de cambio por segundo.
 */
@Component({
  selector: "app-typewriter",
  standalone: true,
  imports: [CommonModule],
  template: `
    <p [class]="className" (click)="skip()" [style.cursor]="complete ? 'default' : 'pointer'">
      {{ visibleText }}
      @if (!complete) {
        <span class="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary align-middle"></span>
      }
    </p>
  `,
})
export class TypewriterComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) text = "";
  @Input() speed = 45;
  @Input() className = "";

  visibleText = "";
  complete = false;

  private raf = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes["text"]) return;
    this.restart();
  }

  private restart(): void {
    cancelAnimationFrame(this.raf);
    this.visibleText = "";
    this.complete = false;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced || this.text.length === 0) {
      this.visibleText = this.text;
      this.complete = true;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const chars = Math.floor(((now - start) / 1000) * this.speed);
      if (chars >= this.text.length) {
        this.visibleText = this.text;
        this.complete = true;
        return;
      }
      this.visibleText = this.text.slice(0, chars);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  skip(): void {
    if (this.complete) return;
    cancelAnimationFrame(this.raf);
    this.visibleText = this.text;
    this.complete = true;
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }
}

import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { D20DiceComponent, type RollResult } from "../../shared/components/d20-dice/d20-dice.component";
import { SignupFormComponent } from "../../features/signup-form/signup-form.component";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, D20DiceComponent, SignupFormComponent, RouterLink],
  templateUrl: "./home.component.html",
})
export class HomeComponent {
  fate: RollResult | null = null;

  onFateRoll(r: RollResult): void {
    this.fate = r;
  }

  fateMessage(): string {
    if (!this.fate) return "";
    if (this.fate.crit) return "20 natural. La mesa te está esperando.";
    if (this.fate.fumble) return "Un 1. Igual entrás: los mejores personajes arrancan mal.";
    return this.fate.success ? "Superaste la tirada. Buena señal." : "No llegaste. En rol eso también es una historia.";
  }
}

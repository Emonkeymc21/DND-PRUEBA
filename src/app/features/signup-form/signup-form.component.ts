import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import {
  EXPERIENCIA,
  SISTEMA,
  TEMATICA,
  MODALIDAD,
  FRECUENCIA,
  DISPONIBILIDAD,
  LINEAS_ROJAS,
} from "../../core/data/ml-simulation-dataset";
import { SignupService, type SignupPayload } from "../../core/services/signup.service";

type Status = "idle" | "sending" | "sent" | "queued";

/**
 * Formulario único de inscripción.
 *
 * "sent" y "queued" muestran EXACTAMENTE la misma pantalla de éxito — la
 * persona nunca ve una distinción entre "confirmado por el servidor" y
 * "guardado local, se reintenta solo". Nunca hay un cartel de error.
 */
@Component({
  selector: "app-signup-form",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./signup-form.component.html",
})
export class SignupFormComponent implements OnInit {
  @Input() quizTags: string[] = [];
  @Input() source = "web";
  @Output() done = new EventEmitter<void>();

  readonly EXPERIENCIA = EXPERIENCIA;
  readonly SISTEMA = SISTEMA;
  readonly TEMATICA = TEMATICA;
  readonly MODALIDAD = MODALIDAD;
  readonly FRECUENCIA = FRECUENCIA;
  readonly DISPONIBILIDAD = DISPONIBILIDAD;
  readonly LINEAS_ROJAS = LINEAS_ROJAS;

  status: Status = "idle";
  tematicasSel: string[] = [];
  disponibilidadSel: string[] = [];
  lineasRojasSel: string[] = [];
  honeypot = "";
  private startedAt = Date.now();

  form = this.fb.nonNullable.group({
    nombre: ["", [Validators.required, Validators.minLength(2)]],
    contacto: ["", [Validators.required, Validators.minLength(3)]],
    experiencia: ["", Validators.required],
    sistema: ["indistinto"],
    modalidad: ["indistinto"],
    frecuencia: ["quincenal"],
    notas: [""],
  });

  constructor(
    private fb: FormBuilder,
    private signup: SignupService,
  ) {}

  ngOnInit(): void {
    this.startedAt = Date.now();
  }

  toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  toggleTematica(v: string): void {
    this.tematicasSel = this.toggle(this.tematicasSel, v);
  }
  toggleDisponibilidad(v: string): void {
    this.disponibilidadSel = this.toggle(this.disponibilidadSel, v);
  }
  toggleLineaRoja(v: string): void {
    this.lineasRojasSel = this.toggle(this.lineasRojasSel, v);
  }

  get firstName(): string {
    return (this.form.value.nombre ?? "").trim().split(" ")[0] ?? "";
  }

  submit(): void {
    if (this.form.invalid || this.status === "sending") return;

    this.status = "sending";
    const v = this.form.getRawValue();

    const payload: SignupPayload = {
      nombre: v.nombre.trim(),
      contacto: v.contacto.trim(),
      experiencia: v.experiencia,
      sistema: v.sistema,
      tematicas: this.tematicasSel,
      modalidad: v.modalidad,
      frecuencia: v.frecuencia,
      disponibilidad: this.disponibilidadSel,
      lineasRojas: this.lineasRojasSel,
      notas: v.notas.trim(),
      mlTags: this.quizTags,
      mlVector: null,
      mlArchetype: null,
      mlCampaign: null,
      source: this.source,
      website: this.honeypot,
      elapsedMs: Date.now() - this.startedAt,
    };

    this.signup.submit(payload).subscribe((res) => {
      this.status = res.status;
      this.done.emit();
    });
  }
}

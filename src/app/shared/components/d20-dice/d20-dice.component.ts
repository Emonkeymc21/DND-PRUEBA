import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  NgZone,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import * as THREE from "three";

/**
 * Dado d20 en 3D real, Three.js puro (sin @react-three/fiber — acá el
 * equivalente conceptual sería @angular-three, que suma una capa de
 * reconciliador para un único objeto con loop propio; mismo argumento que en
 * la versión React). Icosaedro real, MeshStandardMaterial, tres luces, física
 * propia por integración de velocidad angular, resultado 1-20 sorteado con
 * crypto ANTES de animar. Prohibido SVG/2D: no hay ningún fallback plano acá
 * salvo el caso sin WebGL, que muestra un aviso, no un dado falso.
 */

export type RollResult = {
  roll: number;
  mod: number;
  total: number;
  dc: number | null;
  success: boolean | null;
  crit: boolean;
  fumble: boolean;
};

type FaceInfo = { index: number; number: number; normal: THREE.Vector3; center: THREE.Vector3 };

const FACE_NUMBERS = [20, 8, 14, 2, 16, 6, 12, 4, 18, 10, 1, 13, 7, 19, 5, 15, 9, 11, 3, 17];
const ROLL_MS = 1900;

function computeFaces(geometry: THREE.BufferGeometry): FaceInfo[] {
  const pos = geometry.getAttribute("position");
  const faces: FaceInfo[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const normal = center.clone().normalize();
    const index = i / 3;
    faces.push({ index, number: FACE_NUMBERS[index % 20] ?? index + 1, normal, center });
  }
  return faces;
}

function numberTexture(value: number, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#140F07";
  ctx.font = `bold ${size * 0.6}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = String(value);
  ctx.fillText(text, size / 2, size / 2);
  if (value === 6 || value === 9) {
    ctx.fillRect(size * 0.35, size * 0.78, size * 0.3, size * 0.05);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function quaternionForFace(normal: THREE.Vector3): THREE.Quaternion {
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(normal.clone().normalize(), up);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.24);
  return tilt.multiply(q);
}

function rollD20(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / 20) * 20;
    let v = 0;
    do {
      crypto.getRandomValues(arr);
      v = arr[0]!;
    } while (v >= limit);
    return (v % 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

@Component({
  selector: "app-d20-dice",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-2">
      <button
        type="button"
        (click)="roll()"
        [disabled]="disabled || phase === 'rolling' || !ready"
        [attr.aria-label]="phase === 'rolling' ? 'Tirando el dado' : 'Tirar d20'"
        class="relative grid place-items-center rounded-full transition disabled:cursor-not-allowed"
        [style.width.px]="size"
        [style.height.px]="size"
      >
        <div #mount class="pointer-events-none" [style.width.px]="size" [style.height.px]="size"></div>
        @if (webglFailed) {
          <span class="absolute text-xs text-muted text-center px-2">
            Tu navegador no soporta gráficos 3D acá. Actualizalo para ver el dado.
          </span>
        } @else if (!ready) {
          <span class="absolute text-xs text-muted">Preparando el dado…</span>
        }
      </button>

      <div class="min-h-[3.5rem] text-center">
        @if (phase === 'idle') {
          <button
            type="button"
            (click)="roll()"
            [disabled]="disabled || !ready"
            class="rounded-xl border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {{ label || (dc !== null ? 'Tirar d20 (DC ' + dc + ')' : 'Tirar d20') }}
          </button>
        } @else if (phase === 'rolling') {
          <div class="text-sm font-semibold text-muted">Rodando…</div>
        } @else if (result) {
          <div class="space-y-0.5">
            <div class="font-display text-sm font-bold">
              <span class="text-text">{{ result.roll }}</span>
              @if (result.mod !== 0) {
                <span class="text-muted">
                  {{ result.mod > 0 ? ' + ' : ' − ' }}{{ Math.abs(result.mod) }} =
                  <span class="text-text">{{ result.total }}</span>
                </span>
              }
              @if (result.dc !== null) {
                <span class="text-muted"> vs DC {{ result.dc }}</span>
              }
            </div>
            <div
              class="text-xs font-extrabold uppercase tracking-widest"
              [class.text-primary]="result.crit || result.success === true"
              [class.text-ember]="result.fumble || result.success === false"
              [class.text-muted]="result.success === null && !result.crit && !result.fumble"
            >
              {{
                result.crit
                  ? "¡Crítico!"
                  : result.fumble
                    ? "Pifia"
                    : result.success === true
                      ? "Éxito"
                      : result.success === false
                        ? "Fallo"
                        : "Listo"
              }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class D20DiceComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("mount", { static: true }) mountRef!: ElementRef<HTMLDivElement>;

  @Input() mod = 0;
  @Input() dc: number | null = null;
  @Input() label = "";
  @Input() disabled = false;
  @Input() size = 200;
  @Output() rolled = new EventEmitter<RollResult>();

  readonly Math = Math;

  phase: "idle" | "rolling" | "done" = "idle";
  result: RollResult | null = null;
  ready = false;
  webglFailed = false;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private diceGroup?: THREE.Group;
  private faces: FaceInfo[] = [];
  private raf = 0;
  private spinning = false;
  private angVel = new THREE.Vector3();
  private targetQuat: THREE.Quaternion | null = null;
  private settleT = 0;
  private bounceT = 0;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Sin esto, el dado que ya tiró un resultado en un contexto (por ejemplo,
    // "atacar al Goblin") mostraría ese mismo resultado al reutilizarse para
    // otra criatura, aunque nunca lo hayas vuelto a tirar — el `dc`/`mod`
    // cambiaron pero el estado visual quedó pegado al roll anterior. React
    // resolvía esto remontando el componente entero (key={...}), lo cual acá
    // sería recrear toda la escena de Three.js de nuevo; en vez de eso,
    // simplemente reseteamos el estado de UI y dejamos el WebGL context vivo.
    const relevantChange = changes["dc"] || changes["mod"] || changes["label"];
    if (relevantChange && !relevantChange.firstChange && this.phase !== "rolling") {
      this.phase = "idle";
      this.result = null;
    }
  }

  ngAfterViewInit(): void {
    // El loop de render corre fuera de Angular (NgZone.runOutsideAngular):
    // requestAnimationFrame a 60fps disparando detección de cambios en cada
    // frame sería un desperdicio enorme — sólo entramos a la zona de Angular
    // cuando hay algo que el template necesita mostrar (roll(), resultado).
    this.zone.runOutsideAngular(() => this.initScene());
  }

  private initScene(): void {
    const mount = this.mountRef.nativeElement;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      this.webglFailed = true;
      return;
    }

    const renderer = this.renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.size, this.size);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.6, 5.2);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    const ambient = new THREE.AmbientLight(0xede4d3, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffe6a8, 2.1);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b6ad1, 1.3);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const bounce = new THREE.PointLight(0xa63e28, 0.7, 12);
    bounce.position.set(0, -2, 2);
    scene.add(bounce);

    const geometry = new THREE.IcosahedronGeometry(1.25, 0);
    this.disposables.push(geometry);
    this.faces = computeFaces(geometry);

    const material = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: 0.82,
      roughness: 0.34,
      flatShading: true,
      emissive: 0x2a1f08,
      emissiveIntensity: 0.5,
    });
    this.disposables.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    const diceGroup = new THREE.Group();
    diceGroup.add(mesh);
    this.diceGroup = diceGroup;

    const edges = new THREE.EdgesGeometry(geometry, 1);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xf0dda4, transparent: true, opacity: 0.65 });
    this.disposables.push(edges, edgeMat);
    diceGroup.add(new THREE.LineSegments(edges, edgeMat));

    for (const face of this.faces) {
      const tex = numberTexture(face.number);
      this.disposables.push(tex);
      const spriteMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.disposables.push(spriteMat);
      const planeGeo = new THREE.PlaneGeometry(0.62, 0.62);
      this.disposables.push(planeGeo);
      const plane = new THREE.Mesh(planeGeo, spriteMat);
      plane.position.copy(face.center).multiplyScalar(1.02);
      plane.lookAt(face.center.clone().multiplyScalar(2.5));
      diceGroup.add(plane);
    }

    scene.add(diceGroup);

    const shadowGeo = new THREE.PlaneGeometry(9, 9);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    this.disposables.push(shadowGeo, shadowMat);
    const floor = new THREE.Mesh(shadowGeo, shadowMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.7;
    floor.receiveShadow = true;
    scene.add(floor);

    const twenty = this.faces.find((f) => f.number === 20) ?? this.faces[0]!;
    diceGroup.quaternion.copy(quaternionForFace(twenty.normal));

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (this.spinning && this.diceGroup) {
        const delta = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(this.angVel.x * dt, this.angVel.y * dt, this.angVel.z * dt),
        );
        this.diceGroup.quaternion.premultiply(delta);
        this.angVel.multiplyScalar(Math.pow(0.32, dt));

        this.bounceT += dt;
        const decay = Math.exp(-3.1 * this.bounceT);
        this.diceGroup.position.y = Math.abs(Math.sin(this.bounceT * 9.5)) * 1.15 * decay;

        this.settleT += dt;

        if (this.targetQuat && this.settleT > ROLL_MS / 1000 - 0.75) {
          const k = Math.min(1, (this.settleT - (ROLL_MS / 1000 - 0.75)) / 0.75);
          const eased = 1 - Math.pow(1 - k, 3);
          this.diceGroup.quaternion.slerp(this.targetQuat, eased * 0.35);
          this.angVel.multiplyScalar(1 - eased * 0.6);
        }

        if (this.settleT >= ROLL_MS / 1000) {
          this.spinning = false;
          this.diceGroup.position.y = 0;
          if (this.targetQuat) this.diceGroup.quaternion.copy(this.targetQuat);
        }
      } else if (!reduced && this.diceGroup) {
        this.diceGroup.rotation.y += dt * 0.18;
      }

      renderer.render(scene, camera);
      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);

    // `ready` sí necesita disparar detección de cambios (el template lo lee),
    // así que este único set vuelve a entrar a la zona de Angular.
    this.zone.run(() => {
      this.ready = true;
    });
  }

  roll(): void {
    if (this.phase === "rolling" || this.disabled || !this.diceGroup) return;

    this.phase = "rolling";
    this.result = null;

    const value = rollD20();
    const total = value + this.mod;
    const success = this.dc === null ? null : total >= this.dc;

    const r: RollResult = {
      roll: value,
      mod: this.mod,
      total,
      dc: this.dc,
      success,
      crit: value === 20,
      fumble: value === 1,
    };

    const face = this.faces.find((f) => f.number === value) ?? this.faces[0]!;
    this.targetQuat = quaternionForFace(face.normal);

    this.angVel.set(
      (Math.random() * 2 - 1) * 16 + 10,
      (Math.random() * 2 - 1) * 16 + 10,
      (Math.random() * 2 - 1) * 12,
    );

    this.settleT = 0;
    this.bounceT = 0;
    this.spinning = true;

    window.setTimeout(() => {
      this.zone.run(() => {
        this.result = r;
        this.phase = "done";
        this.rolled.emit(r);
      });
    }, ROLL_MS);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.disposables.forEach((d) => {
      try {
        d.dispose();
      } catch {
        /* noop */
      }
    });
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentNode === this.mountRef?.nativeElement) {
      this.mountRef.nativeElement.removeChild(this.renderer.domElement);
    }
  }
}

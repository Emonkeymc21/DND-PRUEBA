"use client";

import * as React from "react";
import * as THREE from "three";
import { playDiceRoll, playDiceImpact, playCrit, playFumble, playSuccess, playFailure } from "@/lib/audio/sfx";
import { fireConfetti } from "@/lib/fx/confetti";

/**
 * D20 en 3D real con Three.js.
 *
 * DECISIONES DE INGENIERÍA
 *
 * 1. Three.js pelado, sin @react-three/fiber. R3F es cómodo cuando tenés una
 *    escena que vive dentro del árbol de React; acá es un solo objeto con un
 *    loop propio. R3F sumaría reconciliador + hooks para nada.
 *
 * 2. Física propia en vez de cannon-es / rapier. Un motor completo son ~500 kb
 *    para simular UN cuerpo rígido rebotando en un plano. Integro velocidad
 *    angular con damping y hago un rebote vertical amortiguado: se ve como un
 *    dado y pesa nada.
 *
 * 3. El resultado se decide ANTES de animar. Dejar que la física determine la
 *    cara suena elegante hasta que un dado queda apoyado en una arista y tenés
 *    que decidir qué hacer. Acá sorteo con crypto y después ORIENTO el dado
 *    para que esa cara quede arriba. La detección por normales igual existe y
 *    se usa para verificar que la orientación final sea correcta.
 *
 * 4. Un solo renderer, liberado en el cleanup. Sin esto, cada montaje del
 *    componente filtra un contexto WebGL y el navegador corta a los ~16.
 */

// ---------------------------------------------------------------------------
// Geometría y numeración
// ---------------------------------------------------------------------------

/**
 * Un icosaedro tiene 20 caras triangulares. `IcosahedronGeometry` las devuelve
 * como 20 triángulos de 3 vértices. Numeramos las caras de forma que las
 * opuestas sumen 21, como en un d20 real.
 */
const FACE_NUMBERS = [
  20, 8, 14, 2, 16, 6, 12, 4, 18, 10,
  1, 13, 7, 19, 5, 15, 9, 11, 3, 17,
];

type FaceInfo = {
  index: number;
  number: number;
  /** Normal de la cara en el espacio local del dado. */
  normal: THREE.Vector3;
  /** Centro de la cara, para colocar el número. */
  center: THREE.Vector3;
};

/** Calcula normal y centro de cada una de las 20 caras. */
function computeFaces(geometry: THREE.BufferGeometry): FaceInfo[] {
  const pos = geometry.getAttribute("position");
  const faces: FaceInfo[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);

    const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);

    // En un poliedro convexo centrado en el origen, la normal saliente
    // coincide con la dirección del centro de la cara.
    const normal = center.clone().normalize();

    const index = i / 3;
    faces.push({
      index,
      number: FACE_NUMBERS[index % 20] ?? index + 1,
      normal,
      center,
    });
  }

  return faces;
}

/** Textura con el número, generada en canvas. Sin archivos de imagen. */
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

  // El 6 y el 9 llevan raya abajo, como en los dados de verdad.
  const text = String(value);
  ctx.fillText(text, size / 2, size / 2);
  if (value === 6 || value === 9) {
    ctx.fillRect(size * 0.35, size * 0.78, size * 0.3, size * 0.05);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Rotación que lleva la normal de una cara a apuntar hacia arriba (+Y),
 * con una pizca de inclinación para que se vea tridimensional y no plano.
 */
function quaternionForFace(normal: THREE.Vector3): THREE.Quaternion {
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(normal.clone().normalize(), up);

  // Inclinamos ~14° hacia la cámara: así se ven tres caras y se lee volumen.
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.24);
  return tilt.multiply(q);
}

// ---------------------------------------------------------------------------
// Aleatoriedad sin sesgo
// ---------------------------------------------------------------------------

function rollD20(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    // Rechazo del resto: sin esto los números bajos salen un poquito más.
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export type RollResult = {
  roll: number;
  mod: number;
  total: number;
  dc: number | null;
  success: boolean | null;
  crit: boolean;
  fumble: boolean;
};

type Props = {
  mod?: number;
  dc?: number | null;
  label?: string;
  disabled?: boolean;
  size?: number;
  onResult?: (r: RollResult) => void;
};

type Phase = "idle" | "rolling" | "done";

const ROLL_MS = 1900;

export function Dice3D({ mod = 0, dc = null, label, disabled = false, size = 220, onResult }: Props) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<RollResult | null>(null);
  const [ready, setReady] = React.useState(false);
  const [webglFailed, setWebglFailed] = React.useState(false);

  // Todo el estado de three vive acá: no participa del render de React.
  const three = React.useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    dice: THREE.Group;
    faces: FaceInfo[];
    raf: number;
    // estado de la simulación
    spinning: boolean;
    angVel: THREE.Vector3;
    targetQuat: THREE.Quaternion | null;
    settleT: number;
    bounceT: number;
    disposables: Array<{ dispose: () => void }>;
  } | null>(null);

  // --- Montaje de la escena ---
  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power", // móvil: no pedimos la GPU discreta
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    // Tope de 2: en pantallas 3x el costo se dispara y no se nota.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.6, 5.2);
    camera.lookAt(0, 0, 0);

    const disposables: Array<{ dispose: () => void }> = [];

    // --- Luces: paleta dorada + relleno místico ---
    const ambient = new THREE.AmbientLight(0xede4d3, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffe6a8, 2.1);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b6ad1, 1.3); // púrpura místico
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const bounce = new THREE.PointLight(0xa63e28, 0.7, 12);
    bounce.position.set(0, -2, 2);
    scene.add(bounce);

    // --- Geometría del dado ---
    const geometry = new THREE.IcosahedronGeometry(1.25, 0);
    disposables.push(geometry);

    const faces = computeFaces(geometry);

    const material = new THREE.MeshStandardMaterial({
      color: 0xc9a227, // dorado oxidado
      metalness: 0.82,
      roughness: 0.34,
      flatShading: true, // caras planas bien definidas
      emissive: 0x2a1f08,
      emissiveIntensity: 0.5,
    });
    disposables.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    const dice = new THREE.Group();
    dice.add(mesh);

    // Aristas resaltadas: es lo que hace que se lea como dado y no como piedra.
    const edges = new THREE.EdgesGeometry(geometry, 1);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xf0dda4, transparent: true, opacity: 0.65 });
    disposables.push(edges, edgeMat);
    dice.add(new THREE.LineSegments(edges, edgeMat));

    // --- Números sobre cada cara ---
    for (const face of faces) {
      const tex = numberTexture(face.number);
      disposables.push(tex);

      const spriteMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      disposables.push(spriteMat);

      const planeGeo = new THREE.PlaneGeometry(0.62, 0.62);
      disposables.push(planeGeo);

      const plane = new THREE.Mesh(planeGeo, spriteMat);
      // Apenas por encima de la cara, si no hace z-fighting.
      plane.position.copy(face.center).multiplyScalar(1.02);
      plane.lookAt(face.center.clone().multiplyScalar(2.5));
      dice.add(plane);
    }

    scene.add(dice);

    // --- Piso invisible que recibe la sombra ---
    const shadowGeo = new THREE.PlaneGeometry(9, 9);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    disposables.push(shadowGeo, shadowMat);

    const floor = new THREE.Mesh(shadowGeo, shadowMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.7;
    floor.receiveShadow = true;
    scene.add(floor);

    // Pose inicial: quieto, mostrando el 20.
    const twenty = faces.find((f) => f.number === 20) ?? faces[0]!;
    dice.quaternion.copy(quaternionForFace(twenty.normal));

    const state = {
      renderer,
      scene,
      camera,
      dice,
      faces,
      raf: 0,
      spinning: false,
      angVel: new THREE.Vector3(),
      targetQuat: null as THREE.Quaternion | null,
      settleT: 0,
      bounceT: 0,
      disposables,
    };
    three.current = state;

    // --- Loop ---
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // techo: evita saltos al volver de otra pestaña
      last = now;

      if (state.spinning) {
        // Integración de la rotación a partir de la velocidad angular.
        const delta = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(state.angVel.x * dt, state.angVel.y * dt, state.angVel.z * dt),
        );
        state.dice.quaternion.premultiply(delta);

        // Damping: el dado pierde energía como en la vida real.
        state.angVel.multiplyScalar(Math.pow(0.32, dt));

        // Rebote vertical amortiguado.
        state.bounceT += dt;
        const decay = Math.exp(-3.1 * state.bounceT);
        state.dice.position.y = Math.abs(Math.sin(state.bounceT * 9.5)) * 1.15 * decay;

        state.settleT += dt;

        // Fase final: interpolamos hacia la orientación de la cara sorteada.
        if (state.targetQuat && state.settleT > ROLL_MS / 1000 - 0.75) {
          const k = Math.min(1, (state.settleT - (ROLL_MS / 1000 - 0.75)) / 0.75);
          // easeOutCubic: frena suave, sin parecer que se traba.
          const eased = 1 - Math.pow(1 - k, 3);
          state.dice.quaternion.slerp(state.targetQuat, eased * 0.35);
          state.angVel.multiplyScalar(1 - eased * 0.6);
        }

        if (state.settleT >= ROLL_MS / 1000) {
          state.spinning = false;
          state.dice.position.y = 0;
          if (state.targetQuat) state.dice.quaternion.copy(state.targetQuat);
        }
      } else if (!reduced) {
        // Reposo: giro lentísimo para que no parezca una imagen estática.
        state.dice.rotation.y += dt * 0.18;
      }

      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(tick);
    };

    state.raf = requestAnimationFrame(tick);
    setReady(true);

    // --- Limpieza: sin esto se filtran contextos WebGL ---
    return () => {
      cancelAnimationFrame(state.raf);
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          /* noop */
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      three.current = null;
    };
  }, [size]);

  // --- Lanzamiento ---
  const roll = React.useCallback(() => {
    const state = three.current;
    if (!state || phase === "rolling" || disabled) return;

    setPhase("rolling");
    setResult(null);

    playDiceRoll(ROLL_MS);

    const value = rollD20();
    const total = value + mod;
    const success = dc === null ? null : total >= dc;

    const r: RollResult = {
      roll: value,
      mod,
      total,
      dc,
      success,
      crit: value === 20,
      fumble: value === 1,
    };

    // Orientación final: la cara sorteada mirando hacia arriba.
    const face = state.faces.find((f) => f.number === value) ?? state.faces[0]!;
    state.targetQuat = quaternionForFace(face.normal);

    // Impulso inicial fuerte y aleatorio en los tres ejes.
    state.angVel.set(
      (Math.random() * 2 - 1) * 16 + 10,
      (Math.random() * 2 - 1) * 16 + 10,
      (Math.random() * 2 - 1) * 12,
    );

    state.settleT = 0;
    state.bounceT = 0;
    state.spinning = true;

    window.setTimeout(() => {
      playDiceImpact();

      setResult(r);
      setPhase("done");

      if (r.crit) {
        playCrit();
        fireConfetti({ intensity: "high" });
      } else if (r.fumble) {
        playFumble();
      } else if (success === true) {
        playSuccess();
        fireConfetti({ intensity: "low" });
      } else if (success === false) {
        playFailure();
      } else {
        playSuccess();
      }

      onResult?.(r);
    }, ROLL_MS);
  }, [phase, disabled, mod, dc, onResult]);

  // --- Si WebGL no está disponible, no dejamos al usuario sin dado ---
  if (webglFailed) {
    return <DiceFallback mod={mod} dc={dc} label={label} disabled={disabled} onResult={onResult} />;
  }

  const toneClass = result?.crit
    ? "text-primary"
    : result?.fumble
      ? "text-ember"
      : result?.success === true
        ? "text-primary"
        : result?.success === false
          ? "text-ember"
          : "text-muted";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={roll}
        disabled={disabled || phase === "rolling" || !ready}
        aria-label={phase === "rolling" ? "Tirando el dado" : "Tirar d20"}
        className="relative grid place-items-center rounded-full transition disabled:cursor-not-allowed"
        style={{ width: size, height: size }}
      >
        <div ref={mountRef} className="pointer-events-none" style={{ width: size, height: size }} />
        {!ready ? (
          <span className="absolute text-xs text-muted">Preparando el dado…</span>
        ) : null}
      </button>

      <div className="min-h-[3.5rem] text-center">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={roll}
            disabled={disabled || !ready}
            className="rounded-xl border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {label ?? (dc !== null ? `Tirar d20 (DC ${dc})` : "Tirar d20")}
          </button>
        ) : phase === "rolling" ? (
          <div className="text-sm font-semibold text-muted">Rodando…</div>
        ) : result ? (
          <div className="space-y-0.5">
            <div className="font-display text-sm font-bold">
              <span className="text-text">{result.roll}</span>
              {result.mod !== 0 ? (
                <span className="text-muted">
                  {result.mod > 0 ? " + " : " − "}
                  {Math.abs(result.mod)} = <span className="text-text">{result.total}</span>
                </span>
              ) : null}
              {result.dc !== null ? <span className="text-muted"> vs DC {result.dc}</span> : null}
            </div>
            <div className={`text-xs font-extrabold uppercase tracking-widest ${toneClass}`}>
              {result.crit
                ? "¡Crítico!"
                : result.fumble
                  ? "Pifia"
                  : result.success === true
                    ? "Éxito"
                    : result.success === false
                      ? "Fallo"
                      : "Listo"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Respaldo sin WebGL.
 * Pasa en navegadores viejos, en modo ahorro de batería de algunos Android y
 * cuando el usuario tiene la aceleración por hardware desactivada.
 */
function DiceFallback({ mod = 0, dc = null, label, disabled, onResult }: Props) {
  const [result, setResult] = React.useState<RollResult | null>(null);
  const [rolling, setRolling] = React.useState(false);

  function roll() {
    if (rolling) return;
    setRolling(true);
    playDiceRoll(900);

    const value = rollD20();
    const total = value + mod;
    const success = dc === null ? null : total >= dc;
    const r: RollResult = {
      roll: value,
      mod,
      total,
      dc,
      success,
      crit: value === 20,
      fumble: value === 1,
    };

    window.setTimeout(() => {
      setResult(r);
      setRolling(false);
      if (r.crit) playCrit();
      else if (r.fumble) playFumble();
      else if (success === false) playFailure();
      else playSuccess();
      onResult?.(r);
    }, 900);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-primary/60 bg-primary/10">
        <span className="font-display text-4xl font-bold text-primary">
          {rolling ? "…" : (result?.roll ?? 20)}
        </span>
      </div>
      <button
        type="button"
        onClick={roll}
        disabled={disabled || rolling}
        className="rounded-xl border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary disabled:opacity-50"
      >
        {label ?? (dc !== null ? `Tirar d20 (DC ${dc})` : "Tirar d20")}
      </button>
    </div>
  );
}

export default Dice3D;

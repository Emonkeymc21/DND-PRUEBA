/**
 * Dataset de simulación y recomendación.
 *
 * Es la única fuente de verdad de tres cosas que antes estaban desparramadas:
 *   1. La taxonomía EXACTA del formulario (experiencia, sistema, temática…).
 *   2. Los arquetipos de jugador y a qué campaña mapea cada uno.
 *   3. Los ejemplos etiquetados que alimentan el clasificador k-NN.
 *
 * Está en TypeScript y no en JSON a propósito: los `as const` hacen que los
 * valores del formulario, la base de datos y el motor de ML no puedan
 * desincronizarse sin que el compilador lo grite.
 */

// ---------------------------------------------------------------------------
// 1. TAXONOMÍA DEL FORMULARIO
// ---------------------------------------------------------------------------

export const EXPERIENCIA = [
  { value: "espectador", label: "Espectador", hint: "Miré videos o series, nunca jugué" },
  { value: "principiante", label: "Principiante", hint: "Jugué algunas veces" },
  { value: "veterano", label: "Veterano", hint: "Juego seguido o dirijo" },
] as const;

export const SISTEMA = [
  { value: "ligero", label: "Sistema ligero", hint: "Pocas reglas, arrancás en 10 minutos" },
  { value: "dnd5e", label: "D&D 5e", hint: "El clásico, con hoja de personaje" },
  { value: "indies", label: "Indies", hint: "Narrativos, experimentales" },
  { value: "indistinto", label: "Me da igual", hint: "Confío en el Master" },
] as const;

export const TEMATICA = [
  { value: "fantasia_heroica", label: "Fantasía heroica clásica" },
  { value: "fantasia_oscura", label: "Fantasía oscura" },
  { value: "terror", label: "Terror / misterio" },
  { value: "anime", label: "Anime / shonen" },
  { value: "scifi", label: "Sci-fi / cyberpunk" },
  { value: "humor", label: "Humor / distendido" },
] as const;

export const MODALIDAD = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "indistinto", label: "Indistinto" },
] as const;

export const FRECUENCIA = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "esporadica", label: "Esporádica" },
] as const;

export const DISPONIBILIDAD = [
  { value: "tarde_18", label: "Tarde (18 hs)" },
  { value: "noche_20", label: "Noche (20 hs)" },
  { value: "finde_tarde", label: "Fin de semana, tarde" },
  { value: "finde_noche", label: "Fin de semana, noche" },
] as const;

/**
 * Líneas rojas. Son temas que la mesa evita si la persona los marca.
 * No es burocracia: es lo que hace que alguien vuelva a la segunda sesión.
 */
export const LINEAS_ROJAS = [
  { value: "violencia_grafica", label: "Violencia gráfica" },
  { value: "horror_corporal", label: "Horror corporal" },
  { value: "contenido_sexual", label: "Contenido sexual" },
  { value: "dano_animales", label: "Daño a animales" },
  { value: "aracnidos", label: "Arañas / insectos" },
  { value: "traicion_pvp", label: "Traición entre jugadores" },
  { value: "tematica_suicidio", label: "Suicidio / autolesión" },
] as const;

export type ExperienciaValue = (typeof EXPERIENCIA)[number]["value"];
export type SistemaValue = (typeof SISTEMA)[number]["value"];
export type TematicaValue = (typeof TEMATICA)[number]["value"];
export type ModalidadValue = (typeof MODALIDAD)[number]["value"];
export type FrecuenciaValue = (typeof FRECUENCIA)[number]["value"];
export type DisponibilidadValue = (typeof DISPONIBILIDAD)[number]["value"];
export type LineaRojaValue = (typeof LINEAS_ROJAS)[number]["value"];

/** Listas de valores puros, para validar con Zod sin repetirlas a mano. */
export const EXPERIENCIA_VALUES = EXPERIENCIA.map((o) => o.value) as [ExperienciaValue, ...ExperienciaValue[]];
export const SISTEMA_VALUES = SISTEMA.map((o) => o.value) as [SistemaValue, ...SistemaValue[]];
export const TEMATICA_VALUES = TEMATICA.map((o) => o.value) as [TematicaValue, ...TematicaValue[]];
export const MODALIDAD_VALUES = MODALIDAD.map((o) => o.value) as [ModalidadValue, ...ModalidadValue[]];
export const FRECUENCIA_VALUES = FRECUENCIA.map((o) => o.value) as [FrecuenciaValue, ...FrecuenciaValue[]];
export const DISPONIBILIDAD_VALUES = DISPONIBILIDAD.map((o) => o.value) as [
  DisponibilidadValue,
  ...DisponibilidadValue[],
];
export const LINEA_ROJA_VALUES = LINEAS_ROJAS.map((o) => o.value) as [LineaRojaValue, ...LineaRojaValue[]];

// ---------------------------------------------------------------------------
// 2. ESPACIO VECTORIAL
// ---------------------------------------------------------------------------

/**
 * Las 8 dimensiones sobre las que se compara todo.
 * Todas normalizadas a 0..1 antes de calcular similitud coseno.
 *
 * Elegí 8 y no 40 a propósito: con pocos ejemplos etiquetados, más dimensiones
 * es más ruido (la maldición de la dimensionalidad no perdona). Estas 8 son
 * ortogonales entre sí y cada una se puede explicar en una frase.
 */
export const DIMENSIONS = [
  "combate", // resuelve peleando ↔ hablando
  "creatividad", // se sale del molde ↔ va a lo seguro
  "equipo", // suma al grupo ↔ va solo
  "ley", // respeta el sistema ↔ improvisa
  "riesgo", // se juega ↔ mide
  "oscuridad", // tolera lo tétrico ↔ prefiere luminoso
  "regla", // disfruta la mecánica ↔ prefiere ficción
  "humor", // busca comedia ↔ busca gravedad
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type Vector = Record<Dimension, number>;

export function zeroVector(): Vector {
  return {
    combate: 0.5,
    creatividad: 0.5,
    equipo: 0.5,
    ley: 0.5,
    riesgo: 0.5,
    oscuridad: 0.5,
    regla: 0.5,
    humor: 0.5,
  };
}

// ---------------------------------------------------------------------------
// 3. ARQUETIPOS DE JUGADOR
// ---------------------------------------------------------------------------

export type Archetype = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Centroide en el espacio de 8 dimensiones. */
  vector: Vector;
  /** Clase de D&D que le queda cómoda (guiño, no dogma). */
  suggestedClass: string;
  /** Qué necesita esta persona del Master para engancharse. */
  masterTip: string;
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "tactico",
    name: "El Táctico",
    tagline: "Si hay un plan, lo tenés vos.",
    description:
      "Pensás dos turnos adelante. Te divierte el sistema tanto como la historia y disfrutás cuando una jugada sale exactamente como la planeaste.",
    vector: { combate: 0.8, creatividad: 0.55, equipo: 0.75, ley: 0.85, riesgo: 0.35, oscuridad: 0.5, regla: 0.9, humor: 0.35 },
    suggestedClass: "Paladín",
    masterTip: "Dale combates con terreno y objetivos, no sacos de puntos de golpe.",
  },
  {
    id: "instigador",
    name: "El Instigador",
    tagline: "Preguntás '¿y si…?' y la mesa entra en pánico.",
    description:
      "Improvisás con lo que haya a mano y encontrás la solución que nadie vio. A veces explota. Cuando sale, es la anécdota de la campaña.",
    vector: { combate: 0.55, creatividad: 0.95, equipo: 0.5, ley: 0.12, riesgo: 0.9, oscuridad: 0.55, regla: 0.3, humor: 0.7 },
    suggestedClass: "Pícaro",
    masterTip: "Nunca le cierres una idea con 'no podés'. Pedile una tirada difícil.",
  },
  {
    id: "corazon",
    name: "El Corazón",
    tagline: "Sin vos el grupo se desarma.",
    description:
      "Te importan los personajes: los tuyos y los del resto. Preguntás qué siente la gente y hacés que los demás queden bien.",
    vector: { combate: 0.25, creatividad: 0.6, equipo: 0.98, ley: 0.6, riesgo: 0.35, oscuridad: 0.35, regla: 0.35, humor: 0.55 },
    suggestedClass: "Clérigo",
    masterTip: "Dale NPCs con vínculos. Va a construir la campaña por vos.",
  },
  {
    id: "narrador",
    name: "El Narrador",
    tagline: "Venís por la historia, no por el dado.",
    description:
      "Preferís una buena escena de tensión antes que tres rondas de iniciativa. Te metés en la piel del personaje y te quedás ahí.",
    vector: { combate: 0.1, creatividad: 0.8, equipo: 0.7, ley: 0.5, riesgo: 0.4, oscuridad: 0.6, regla: 0.15, humor: 0.4 },
    suggestedClass: "Bardo",
    masterTip: "Sistema liviano y mucho espacio para hablar. El combate que sea corto.",
  },
  {
    id: "vanguardia",
    name: "La Vanguardia",
    tagline: "Primero entrás, después preguntás.",
    description:
      "La duda te aburre. Preferís el error rápido a la deliberación eterna, y solés arrastrar al grupo a la aventura.",
    vector: { combate: 0.95, creatividad: 0.45, equipo: 0.45, ley: 0.15, riesgo: 0.95, oscuridad: 0.6, regla: 0.55, humor: 0.5 },
    suggestedClass: "Bárbaro",
    masterTip: "Consecuencias rápidas y visibles. Si dudás, tirá un monstruo.",
  },
  {
    id: "investigador",
    name: "El Investigador",
    tagline: "Vos leíste la nota que nadie leyó.",
    description:
      "Te encanta armar el rompecabezas. Tomás notas, atás cabos y llegás con la teoría antes que el resto.",
    vector: { combate: 0.3, creatividad: 0.75, equipo: 0.6, ley: 0.7, riesgo: 0.3, oscuridad: 0.8, regla: 0.5, humor: 0.25 },
    suggestedClass: "Mago",
    masterTip: "Sembrá pistas reales y sostené el misterio. Se va a dar cuenta si improvisás.",
  },
  {
    id: "explorador",
    name: "El Explorador",
    tagline: "Todavía no sabés qué te gusta, y está perfecto.",
    description:
      "Recién llegás o venís probando. Te copa un poco de todo y no tenés vicios adquiridos. La mejor materia prima de una mesa.",
    vector: { combate: 0.5, creatividad: 0.5, equipo: 0.6, ley: 0.5, riesgo: 0.5, oscuridad: 0.45, regla: 0.4, humor: 0.6 },
    suggestedClass: "Explorador",
    masterTip: "Mesa de introducción con reglas mínimas y una escena de cada tipo.",
  },
];

// ---------------------------------------------------------------------------
// 4. PERFILES DE CAMPAÑA
// ---------------------------------------------------------------------------

export type CampaignProfile = {
  id: string;
  name: string;
  pitch: string;
  vector: Vector;
  sistema: SistemaValue;
  tematica: TematicaValue;
  /** Para qué nivel de experiencia está pensada. */
  experiencia: ExperienciaValue[];
  frecuencia: FrecuenciaValue;
  /** Advertencias de contenido: se cruzan con las líneas rojas del jugador. */
  contenido: LineaRojaValue[];
};

export const CAMPAIGN_PROFILES: CampaignProfile[] = [
  {
    id: "heroica_intro",
    name: "La Senda del Héroe",
    pitch: "Fantasía clásica, reglas mínimas y una primera aventura pensada para que nadie se pierda.",
    vector: { combate: 0.5, creatividad: 0.55, equipo: 0.8, ley: 0.6, riesgo: 0.4, oscuridad: 0.2, regla: 0.25, humor: 0.65 },
    sistema: "ligero",
    tematica: "fantasia_heroica",
    experiencia: ["espectador", "principiante"],
    frecuencia: "quincenal",
    contenido: [],
  },
  {
    id: "heroica_5e",
    name: "Los Reinos Partidos",
    pitch: "D&D 5e completo: construcción de personaje, combate táctico y una campaña larga con progresión.",
    vector: { combate: 0.78, creatividad: 0.55, equipo: 0.7, ley: 0.8, riesgo: 0.45, oscuridad: 0.35, regla: 0.92, humor: 0.4 },
    sistema: "dnd5e",
    tematica: "fantasia_heroica",
    experiencia: ["principiante", "veterano"],
    frecuencia: "semanal",
    contenido: ["violencia_grafica"],
  },
  {
    id: "dark_fantasy",
    name: "Ceniza y Juramento",
    pitch: "Fantasía oscura: recursos escasos, decisiones que cuestan y un mundo que no perdona.",
    vector: { combate: 0.7, creatividad: 0.6, equipo: 0.55, ley: 0.35, riesgo: 0.8, oscuridad: 0.95, regla: 0.6, humor: 0.15 },
    sistema: "dnd5e",
    tematica: "fantasia_oscura",
    experiencia: ["principiante", "veterano"],
    frecuencia: "quincenal",
    contenido: ["violencia_grafica", "horror_corporal"],
  },
  {
    id: "misterio",
    name: "El Expediente de Vela Negra",
    pitch: "Investigación y terror contenido. Pistas reales, tensión creciente y poco combate.",
    vector: { combate: 0.2, creatividad: 0.8, equipo: 0.65, ley: 0.7, riesgo: 0.4, oscuridad: 0.85, regla: 0.35, humor: 0.2 },
    sistema: "indies",
    tematica: "terror",
    experiencia: ["principiante", "veterano"],
    frecuencia: "quincenal",
    contenido: ["horror_corporal", "aracnidos"],
  },
  {
    id: "shonen",
    name: "Torneo del Cielo Roto",
    pitch: "Anime puro: técnicas imposibles, rivales con nombre y peleas que suben de escala.",
    vector: { combate: 0.9, creatividad: 0.75, equipo: 0.7, ley: 0.3, riesgo: 0.85, oscuridad: 0.3, regla: 0.45, humor: 0.75 },
    sistema: "ligero",
    tematica: "anime",
    experiencia: ["espectador", "principiante", "veterano"],
    frecuencia: "semanal",
    contenido: [],
  },
  {
    id: "cyberpunk",
    name: "Distrito Cero",
    pitch: "Sci-fi sucio: contratos, corporaciones y nadie con las manos limpias.",
    vector: { combate: 0.6, creatividad: 0.85, equipo: 0.5, ley: 0.2, riesgo: 0.75, oscuridad: 0.7, regla: 0.5, humor: 0.35 },
    sistema: "indies",
    tematica: "scifi",
    experiencia: ["principiante", "veterano"],
    frecuencia: "quincenal",
    contenido: ["violencia_grafica"],
  },
  {
    id: "distendida",
    name: "La Taberna del Fin del Mundo",
    pitch: "Sesiones sueltas y con humor. Venís cuando podés, te reís y te vas contento.",
    vector: { combate: 0.35, creatividad: 0.7, equipo: 0.85, ley: 0.4, riesgo: 0.45, oscuridad: 0.15, regla: 0.2, humor: 0.95 },
    sistema: "ligero",
    tematica: "humor",
    experiencia: ["espectador", "principiante", "veterano"],
    frecuencia: "esporadica",
    contenido: [],
  },
];

// ---------------------------------------------------------------------------
// 5. EJEMPLOS ETIQUETADOS (entrenamiento del k-NN de texto)
// ---------------------------------------------------------------------------

export type TrainingExample = {
  /** Lo que alguien podría escribir en el simulador. */
  text: string;
  /** Hacia dónde empuja cada dimensión (deltas -1..1). */
  push: Partial<Vector>;
  archetype: string;
};

/**
 * 48 ejemplos en español rioplatense.
 *
 * Sobre el tamaño: con k-NN no necesitás miles de ejemplos como con una red.
 * Necesitás cobertura de las regiones del espacio. Estos cubren las 8
 * dimensiones en ambos extremos. Si el Master quiere afinarlo, agrega ejemplos
 * acá y el motor los toma sin reentrenar nada.
 */
export const TRAINING_SET: TrainingExample[] = [
  // --- Combate alto ---
  { text: "desenvaino la espada y ataco al que tengo más cerca", push: { combate: 0.9, riesgo: 0.7, regla: 0.6 }, archetype: "vanguardia" },
  { text: "le tiro una flecha a la cabeza sin avisar", push: { combate: 0.85, equipo: 0.15, riesgo: 0.75 }, archetype: "vanguardia" },
  { text: "cargo contra el grupo de enemigos gritando", push: { combate: 0.95, riesgo: 0.95, ley: 0.15 }, archetype: "vanguardia" },
  { text: "me pongo en la puerta y aguanto mientras los demás pasan", push: { combate: 0.7, equipo: 0.95, ley: 0.75 }, archetype: "tactico" },
  { text: "busco posición elevada antes de que empiece la pelea", push: { combate: 0.75, ley: 0.9, regla: 0.9, riesgo: 0.25 }, archetype: "tactico" },
  { text: "ataco al mago primero porque es el más peligroso", push: { combate: 0.85, regla: 0.85, ley: 0.7 }, archetype: "tactico" },

  // --- Social / narrativo ---
  { text: "trato de hablar con él y entender qué quiere", push: { combate: 0.05, equipo: 0.7, regla: 0.15 }, archetype: "narrador" },
  { text: "le cuento una historia para ganar tiempo", push: { combate: 0.05, creatividad: 0.85, regla: 0.1 }, archetype: "narrador" },
  { text: "le pregunto por su familia, algo no cierra en lo que dijo", push: { combate: 0.1, creatividad: 0.7, oscuridad: 0.65 }, archetype: "investigador" },
  { text: "negocio un trato que nos convenga a los dos", push: { combate: 0.15, ley: 0.85, equipo: 0.7 }, archetype: "corazon" },
  { text: "me presento con respeto y espero su respuesta", push: { combate: 0.05, ley: 0.9, riesgo: 0.15 }, archetype: "corazon" },
  { text: "le miento diciendo que somos guardias reales", push: { combate: 0.15, creatividad: 0.8, ley: 0.05 }, archetype: "instigador" },

  // --- Creatividad ---
  { text: "agarro la antorcha y la tiro al charco de aceite", push: { creatividad: 0.98, riesgo: 0.8, combate: 0.6 }, archetype: "instigador" },
  { text: "uso la cuerda para armar una trampa en la entrada", push: { creatividad: 0.9, ley: 0.55, regla: 0.6 }, archetype: "instigador" },
  { text: "me disfrazo con la ropa del guardia caído", push: { creatividad: 0.9, ley: 0.2, riesgo: 0.6 }, archetype: "instigador" },
  { text: "en vez de abrir la puerta, rompo la pared de al lado", push: { creatividad: 0.85, ley: 0.1, riesgo: 0.7 }, archetype: "instigador" },
  { text: "uso el espejo para reflejar la luz hacia la criatura", push: { creatividad: 0.95, combate: 0.5, regla: 0.4 }, archetype: "instigador" },
  { text: "hago lo obvio, abro la puerta y entro", push: { creatividad: 0.08, riesgo: 0.6, regla: 0.4 }, archetype: "vanguardia" },

  // --- Equipo ---
  { text: "les aviso a todos antes de moverme", push: { equipo: 0.95, ley: 0.8, riesgo: 0.2 }, archetype: "corazon" },
  { text: "curo al que está herido antes de seguir", push: { equipo: 0.98, combate: 0.2, ley: 0.7 }, archetype: "corazon" },
  { text: "propongo que decidamos entre todos", push: { equipo: 0.95, ley: 0.85, riesgo: 0.15 }, archetype: "corazon" },
  { text: "cubro la espalda de mi compañero", push: { equipo: 0.9, combate: 0.6, ley: 0.7 }, archetype: "tactico" },
  { text: "me adelanto solo sin decirle a nadie", push: { equipo: 0.05, riesgo: 0.85, ley: 0.15 }, archetype: "vanguardia" },
  { text: "me guardo la información para usarla después", push: { equipo: 0.1, creatividad: 0.7, ley: 0.15 }, archetype: "instigador" },

  // --- Ley / caos ---
  { text: "respeto el trato que hicimos aunque no me guste", push: { ley: 0.95, equipo: 0.7, riesgo: 0.2 }, archetype: "tactico" },
  { text: "sigo el protocolo y aviso a las autoridades", push: { ley: 0.98, riesgo: 0.1, regla: 0.7 }, archetype: "tactico" },
  { text: "le robo la llave del cinturón mientras duerme", push: { ley: 0.05, creatividad: 0.75, riesgo: 0.7 }, archetype: "instigador" },
  { text: "prendo fuego todo y salgo corriendo", push: { ley: 0.02, riesgo: 0.98, creatividad: 0.6, humor: 0.6 }, archetype: "instigador" },
  { text: "ignoro lo que me dijeron y hago lo que quiero", push: { ley: 0.05, equipo: 0.2, riesgo: 0.8 }, archetype: "vanguardia" },

  // --- Cautela / riesgo ---
  { text: "reviso la habitación con cuidado antes de entrar", push: { riesgo: 0.1, ley: 0.75, oscuridad: 0.6 }, archetype: "investigador" },
  { text: "me escondo y observo qué hacen", push: { riesgo: 0.15, combate: 0.15, oscuridad: 0.6 }, archetype: "investigador" },
  { text: "tiro una moneda al pozo para ver qué tan hondo es", push: { riesgo: 0.2, creatividad: 0.8, regla: 0.5 }, archetype: "investigador" },
  { text: "salto al vacío confiando en que hay algo abajo", push: { riesgo: 0.98, ley: 0.1, creatividad: 0.6 }, archetype: "vanguardia" },
  { text: "apuesto todo a una sola tirada", push: { riesgo: 0.95, regla: 0.6, ley: 0.2 }, archetype: "vanguardia" },

  // --- Oscuridad ---
  { text: "examino el cadáver buscando marcas raras", push: { oscuridad: 0.9, creatividad: 0.7, combate: 0.15 }, archetype: "investigador" },
  { text: "leo el diario del muerto aunque me dé impresión", push: { oscuridad: 0.85, creatividad: 0.7, riesgo: 0.45 }, archetype: "investigador" },
  { text: "prefiero no mirar, sigamos adelante", push: { oscuridad: 0.1, riesgo: 0.3, equipo: 0.6 }, archetype: "corazon" },
  { text: "hago un chiste para bajar la tensión del grupo", push: { humor: 0.95, equipo: 0.85, oscuridad: 0.15 }, archetype: "corazon" },
  { text: "me pongo serio, esto no es para reírse", push: { humor: 0.05, oscuridad: 0.8, ley: 0.7 }, archetype: "investigador" },

  // --- Reglas ---
  { text: "quiero usar mi habilidad de clase para esto", push: { regla: 0.95, combate: 0.6, ley: 0.75 }, archetype: "tactico" },
  { text: "pregunto qué bonificador tengo antes de tirar", push: { regla: 0.98, ley: 0.8, riesgo: 0.25 }, archetype: "tactico" },
  { text: "no me importa la mecánica, describo lo que hace mi personaje", push: { regla: 0.05, creatividad: 0.8, combate: 0.25 }, archetype: "narrador" },
  { text: "describo cómo le tiembla la mano mientras habla", push: { regla: 0.05, creatividad: 0.9, combate: 0.1 }, archetype: "narrador" },
  { text: "actúo la voz del personaje y le contesto en personaje", push: { regla: 0.08, creatividad: 0.85, equipo: 0.7 }, archetype: "narrador" },

  // --- Explorador / neutro ---
  { text: "no sé bien qué hacer, ¿qué me conviene?", push: { creatividad: 0.35, riesgo: 0.3, equipo: 0.65 }, archetype: "explorador" },
  { text: "hago lo que haga el grupo", push: { equipo: 0.8, ley: 0.6, riesgo: 0.3 }, archetype: "explorador" },
  { text: "pruebo algo y vemos qué pasa", push: { riesgo: 0.65, creatividad: 0.6, regla: 0.3 }, archetype: "explorador" },
];

/** Índice rápido por id, para no recorrer los arrays en cada request. */
export const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((a) => [a.id, a]));
export const CAMPAIGN_BY_ID = new Map(CAMPAIGN_PROFILES.map((c) => [c.id, c]));

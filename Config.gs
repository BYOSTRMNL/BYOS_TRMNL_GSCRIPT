// ============================================================
// TRMNL BYOS - Configuration partagée
// ============================================================
// Constantes utilisées par tous les autres fichiers du projet.
// Les secrets (tokens, clés API, IDs) vivent dans Script Properties
// (Project Settings), PAS ici - voir setupProperties() dans Router.gs.
// ============================================================

const PROPS = PropertiesService.getScriptProperties();
const TIMEZONE = Session.getScriptTimeZone();
const REFRESH_RATE_SECONDS = 300; // 5 min
const CITY = "Luxembourg,LU";

// IDs des slides du template, une par écran (récupérés depuis l'URL
// Google Slides : .../edit#slide=id.XXXXX)
const SLIDE_IDS = {
  DASHBOARD: "p1",
  MOVIES: "p3",
  TV_RECO: "g3f6d46c9711_0_0",
  TV: "p2",
  //OM:"p5",
  CALVIN: "g3f6d6361725_0_0",
  Garfield: "g3f728ad9622_0_21",
  NEWS1: "p4",
  EVENING:"p7",
  MORNING:"p6",
  NEWS2: "p4"
  // Ajoute ici au fur et à mesure : NEWS, SPORT, CALENDAR...
};

// Ordre de rotation des écrans à chaque cycle de l'ESP.
// Ajoute simplement un nom ici (qui doit avoir une entrée dans
// SLIDE_IDS + une fonction gatherX() correspondante) pour l'intégrer
// à la rotation.
const SCREEN_ORDER = ["MOVIES", "TV", "TV_RECO"];

// DYNAMIC : régénéré à chaque requête de l'ESP (contenu qui change vite).
// STATIC  : régénéré une fois par jour via un déclencheur temporel, servi
//           depuis un cache Drive le reste du temps (contenu qui bouge peu,
//           ou nécessitant un traitement plus lourd).
const SCREEN_MODES = {
  DASHBOARD: "DYNAMIC",
  NEWS1:"DYNAMIC",
  NEWS2:"DYNAMIC",
  EVENING:"STATIC",
  MOVIES: "STATIC",
  TV: "STATIC",
  MORNING:"STATIC",
  TV_RECO: "STATIC",
  //OM:"STATIC",
  CALVIN: "STATIC",
  Garfield :"STATIC"
};

// ------------------------------------------------------------
// PLANNING (jours / horaires)
// ------------------------------------------------------------
// La première règle qui correspond au moment présent l'emporte.
// "days" utilise la numérotation ISO : 1=lundi ... 7=dimanche.
// "startHour"/"endHour" sont en heure locale (TIMEZONE ci-dessus),
// bornes 0-24, fin exclusive (ex: 9-18 couvre 9h00 à 17h59).
//
// Exemple concret de ta demande : "slide A et B seulement le lundi
// entre 15h et 16h" donnerait { days: [1], startHour: 15, endHour: 16,
// screens: ["A", "B"] }.
const SCHEDULE = [
  // Matin avant le travail
  { days: [1, 2, 3, 4, 5], startHour: 0,  endHour: 6,  screens: ["Garfield"] },
    { days: [1, 2, 3, 4, 5], startHour: 6,  endHour: 10,  screens: ["MORNING"] },
  // Journée de travail (personne devant l'écran)
  { days: [1, 2, 3, 4, 5], startHour: 10,  endHour: 18, screens: ["CALVIN"] },
  // Retour du travail / soirée
  { days: [1, 2, 3, 4, 5], startHour: 18, endHour: 22, screens: ["NEWS1","TV_RECO","CALVIN","NEWS2","MOVIES","Garfield"] },
  { days: [1, 2, 3, 4, 5], startHour: 22, endHour: 24, screens: ["EVENING"] },

  // Week-end (6=samedi, 7=dimanche) - toute la journée
  { days: [6, 7], startHour: 6, endHour: 24, screens: ["NEWS1","TV_RECO","CALVIN","NEWS2","MOVIES","Garfield"] }
];

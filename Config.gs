// ============================================================
// TRMNL BYOS - Shared Configuration
// ============================================================
// Constants used across all files in the project.
// API Keys, Tokens, and IDs are stored securely in Script Properties
// (Project Settings) - refer to setupProperties() in Router.gs.
// ============================================================

const PROPS = PropertiesService.getScriptProperties();
const TIMEZONE = Session.getScriptTimeZone();
const REFRESH_RATE_SECONDS = 300; // 5-minute display refresh rate
const CITY = "YOUR_CITY,YOUR_COUNTRY_CODE"; // e.g., "Paris,FR" or "New_York,US"

// Slide IDs from your Google Slides template (one per screen layout).
// Retrieve these from the Slide URL: .../edit#slide=id.YOUR_SLIDE_ID
const SLIDE_IDS = {
  MOVIES: "YOUR_SLIDE_ID_2",
  TV_RECO: "YOUR_SLIDE_ID_3",
  TV: "YOUR_SLIDE_ID_4",
  CALVIN: "YOUR_SLIDE_ID_5",
  GARFIELD: "YOUR_SLIDE_ID_6",
  NEWS1: "YOUR_SLIDE_ID_7",
  EVENING: "YOUR_SLIDE_ID_8",
  MORNING: "YOUR_SLIDE_ID_9",
  NEWS2: "YOUR_SLIDE_ID_10"
};

// Default screen rotation sequence for each cycle requested by the TRMNL device.
// To include a screen in the rotation, add its name here (must match a key in SLIDE_IDS
// and have a corresponding gatherX() data-fetching function).
const SCREEN_ORDER = ["MOVIES", "TV", "TV_RECO"];

// Execution Modes:
// - DYNAMIC : Regenerated on every device request (frequently changing content).
// - STATIC  : Generated once a day via a time-driven trigger and served from Drive cache
//             the rest of the time (infrequently changing or resource-heavy content).
const SCREEN_MODES = {
  NEWS1: "DYNAMIC",
  NEWS2: "DYNAMIC",
  EVENING: "STATIC",
  MOVIES: "STATIC",
  TV: "STATIC",
  MORNING: "STATIC",
  TV_RECO: "STATIC",
  CALVIN: "STATIC",
  GARFIELD: "STATIC"
};

// ------------------------------------------------------------
// DISPLAY SCHEDULE CONFIGURATION
// ------------------------------------------------------------
// The first matching rule evaluated against the current time takes precedence.
// - "days": Uses ISO day numbering (1 = Monday, ..., 7 = Sunday).
// - "startHour"/"endHour": Local time bounds (based on TIMEZONE above),
//   from 0 to 24, end hour exclusive (e.g., 9-18 covers 09:00 to 17:59).
//
// Example: Displaying slides A and B only on Mondays between 15:00 and 16:00
// would be configured as: { days: [1], startHour: 15, endHour: 16, screens: ["A", "B"] }.
const SCHEDULE = [
  // Early morning (Night/Overnight)
  { days: [1, 2, 3, 4, 5], startHour: 0,  endHour: 6,  screens: ["GARFIELD"] },
  
  // Morning routine before work
  { days: [1, 2, 3, 4, 5], startHour: 6,  endHour: 10, screens: ["MORNING"] },
  
  // Work hours (Away/Idle time)
  { days: [1, 2, 3, 4, 5], startHour: 10, endHour: 18, screens: ["CALVIN"] },
  
  // Evening / After work rotation
  { days: [1, 2, 3, 4, 5], startHour: 18, endHour: 22, screens: ["NEWS1", "TV_RECO", "CALVIN", "NEWS2", "MOVIES", "GARFIELD"] },
  
  // Night routine
  { days: [1, 2, 3, 4, 5], startHour: 22, endHour: 24, screens: ["EVENING"] },

  // Weekend schedule (6 = Saturday, 7 = Sunday) - All day rotation
  { days: [6, 7],          startHour: 6,  endHour: 24, screens: ["NEWS1", "TV_RECO", "CALVIN", "NEWS2", "MOVIES", "GARFIELD"] }
];

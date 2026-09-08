Voici ton fichier Router.gs intégralement nettoyé. Les clés d'API, jetons de sécurité et identifiants de présentation ont été remplacés par des placeholders clairs, et l'ensemble de la documentation et des commentaires a été traduit en anglais.

// ============================================================
// TRMNL BYOS - Router (Entry point + Screen rotation engine)
// ============================================================

function doGet(e) {
  const token = PROPS.getProperty("DEVICE_TOKEN") || "YOUR_DEVICE_TOKEN";
  
  // Extract route path: via e.parameter.path (Cloudflare) or e.pathInfo (Direct Apps Script execution)
  const path = (e && e.parameter && e.parameter.path) ? e.parameter.path : (e.pathInfo || "");

  // 1. QUICK TEST / HEALTH CHECK ROUTE (NO TOKEN IN URL)
  if (path === "" || path === "/") {
    return ContentService.createTextOutput(JSON.stringify({
      status: "OK",
      message: "Apps Script Web App is publicly reachable!",
      configured_token: token,
      usage_example: "Append /" + token + "/api/setup or /" + token + "/api/display to the deployment URL"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. TOKEN AUTHENTICATION CHECK
  if (!path.startsWith(token + "/") && !path.startsWith("/" + token + "/")) {
    return ContentService.createTextOutput(JSON.stringify({
      error: "401 Unauthorized - Invalid Security Token",
      received_path: path,
      expected_prefix: token + "/"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Path cleanup
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  const route = cleanPath.substring(token.length + 1);

  // IMPORTANT: Match on the EXACT last path segment rather than a substring search.
  // Device firmwares automatically append "/api/setup" or "/api/display".
  // Matching on exact trailing segments prevents duplicate routing errors.
  const lastSegment = route.split("/").filter(Boolean).pop() || "";

  if (lastSegment === "setup") {
    return handleSetup(e);
  }
  return handleDisplay(e); // Routes "api/display" and all fallbacks
}

// Firmware logging hook endpoint
function doPost(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 200 }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Initial handshake request payload handler
function handleSetup(e) {
  const screen = pickScreenForThisCycle(e);
  const imageUrl = getImageUrlForScreen(screen);

  const response = {
    status: 0,
    image_url: imageUrl,
    filename: "setup_screen",
    refresh_rate: REFRESH_RATE_SECONDS || 900,
    reset_firmware: false,
    update_firmware: false,
    special_function: null
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Main display loop payload handler
function handleDisplay(e) {
  const screen = pickScreenForThisCycle(e);
  const imageUrl = getImageUrlForScreen(screen);

  const response = {
    status: 0, // 0 indicates success per TRMNL API specs
    image_url: imageUrl,
    filename: screen.toLowerCase() + "-" + Utilities.formatDate(new Date(), TIMEZONE, "yyyyMMddHHmmss"),
    refresh_rate: REFRESH_RATE_SECONDS || 900,
    reset_firmware: false,
    update_firmware: false
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Resolves and returns the image URL for the requested screen
function getImageUrlForScreen(screen) {
  if (SCREEN_MODES[screen] === "STATIC") {
    const cached = PROPS.getProperty("IMAGE_URL_" + screen);
    if (cached) return cached;
    return regenerateScreen(screen); // Fallback for initial startup
  }
  return regenerateScreen(screen);
}

// Generates an image for a target screen and publishes it to Google Drive
function regenerateScreen(screen) {
  const data = gatherDataForScreen(screen);
  const blob = renderSlideWithData(SLIDE_IDS[screen], data.text, data.images);
  const url = publishToDrive(blob, screen);
  PROPS.setProperty("IMAGE_URL_" + screen, url);
  return url;
}

// ------------------------------------------------------------
// DAILY SCHEDULED JOBS (Renders standard STATIC screens at 06:00)
// ------------------------------------------------------------
// EVENING screen is intentionally excluded here—it has its own scheduled
// trigger (at 20:00) so weather and calendar data stay accurate.
function dailyRegenerateStaticScreens() {
  Object.keys(SCREEN_MODES).forEach(screen => {
    if (SCREEN_MODES[screen] === "STATIC" && screen !== "EVENING") {
      regenerateScreen(screen);
    }
  });
}

// Dedicated regeneration job for the EVENING screen at 20:00
function dailyRegenerateEveningView() {
  regenerateScreen("EVENING");
}

// Time-driven trigger setup for daily morning static regeneration
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "dailyRegenerateStaticScreens") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("dailyRegenerateStaticScreens")
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}

// Run manually once to install the dedicated 20:00 trigger for EVENING
function setupEveningTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "dailyRegenerateEveningView") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("dailyRegenerateEveningView")
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();
}

// ------------------------------------------------------------
// SCREEN ROTATION LOGIC
// ------------------------------------------------------------
function pickScreenForThisCycle(e) {
  if (e && e.parameter && e.parameter.screen && SCREEN_ORDER.includes(e.parameter.screen)) {
    return e.parameter.screen;
  }
  const eligible = getEligibleScreensNow();
  const idx = parseInt(PROPS.getProperty("SCREEN_INDEX") || "0", 10);
  const screen = eligible[idx % eligible.length];
  PROPS.setProperty("SCREEN_INDEX", String((idx + 1) % eligible.length));
  return screen;
}

function getEligibleScreensNow() {
  const now = new Date();
  const day = parseInt(Utilities.formatDate(now, TIMEZONE, "u"), 10);
  const hour = parseInt(Utilities.formatDate(now, TIMEZONE, "H"), 10);

  const match = SCHEDULE.find(block =>
    block.days.includes(day) && hour >= block.startHour && hour < block.endHour
  );

  return match ? match.screens : SCREEN_ORDER;
}

function gatherDataForScreen(screen) {
  switch (screen) {
    case "DASHBOARD": return gatherDashboard(new Date());
    case "MOVIES": return gatherMovies();
    case "TV": return gatherTV();
    case "TV_RECO": return gatherTrendingTV();
    case "CALVIN": return gatherCalvinAndHobbes();
    case "GARFIELD": return gatherGarfield();
    case "MORNING": return gatherTodayView();
    case "EVENING": return gatherEveningView();
    case "NEWS1": return gatherMultiRssNews();
    case "NEWS2": return gatherMultiRssNews();
    default: throw new Error("Unknown screen identifier: " + screen);
  }
}

// ------------------------------------------------------------
// INITIAL SCRIPT ENVIRONMENT SETUP
// ------------------------------------------------------------
// Run this once manually inside Apps Script editor to inject secrets
function setupProperties() {
  PROPS.setProperties({
    DEVICE_TOKEN: "YOUR_CUSTOM_DEVICE_TOKEN",
    TEMPLATE_PRESENTATION_ID: "YOUR_GOOGLE_SLIDES_PRESENTATION_ID",
    OPENWEATHER_API_KEY: "YOUR_OPENWEATHER_API_KEY",
    SIMKL_CLIENT_ID: "YOUR_SIMKL_CLIENT_ID",
    SIMKL_ACCESS_TOKEN: "YOUR_SIMKL_ACCESS_TOKEN"
  });
}

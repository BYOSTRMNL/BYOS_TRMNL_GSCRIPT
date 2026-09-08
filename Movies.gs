// ============================================================
// TRMNL BYOS - MOVIES Screen (Trending Simkl + posters)
// ============================================================

/**
 * Helper to safely extract the SIMKL ID across various schema variations.
 */
function extractSimklId(item) {
  if (!item) return null;
  const target = item.movie || item;
  
  if (target.ids) {
    return target.ids.simkl || target.ids.simkl_id || null;
  }
  return target.simkl || target.simkl_id || null;
}

/**
 * Gathers top 4 trending movies from SIMKL CDN that the user has NOT watched yet.
 * Formats titles, descriptions, and fetches poster image blobs.
 */
function gatherMovies() {
  const text = {};
  const images = {};

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const clientId = scriptProperties.getProperty('SIMKL_CLIENT_ID');
    const accessToken = scriptProperties.getProperty('SIMKL_ACCESS_TOKEN');

    if (!clientId || !accessToken) {
      throw new Error("Missing credentials in Script Properties.");
    }

    // 1. Fetch Top 100 Trending Movies from CDN
    const cdnUrl = "https://data.simkl.in/discover/trending/movies/week_100.json";
    const listRes = UrlFetchApp.fetch(cdnUrl, { muteHttpExceptions: true });

    if (listRes.getResponseCode() !== 200) {
      throw new Error(`CDN returned HTTP status ${listRes.getResponseCode()}`);
    }

    const rawTrending = JSON.parse(listRes.getContentText());

    // 2. Fetch User's Completed/Watched Movies (simkl_ids_only keeps response fast)
    const watchedUrl = `https://api.simkl.com/sync/all-items/movies/completed?extended=simkl_ids_only&client_id=${clientId}`;
    const watchedOptions = {
      method: "get",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "simkl-api-key": clientId,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const watchedRes = UrlFetchApp.fetch(watchedUrl, watchedOptions);
    if (watchedRes.getResponseCode() !== 200) {
      throw new Error(`Watched list API returned HTTP status ${watchedRes.getResponseCode()}`);
    }

    const watchedData = JSON.parse(watchedRes.getContentText());
    const watchedItems = watchedData.movies || [];

    // Create lookup Set of watched SIMKL IDs
    const watchedIds = new Set(
      watchedItems.map(item => extractSimklId(item)).filter(Boolean)
    );

    // 3. Filter CDN trending list for unwatched movies
    const filteredTrending = [];
    for (const movie of rawTrending) {
      const simklId = extractSimklId(movie);
      
      // Skip if watched or ID missing
      if (!simklId || watchedIds.has(simklId)) {
        continue;
      }

      filteredTrending.push(movie);

      if (filteredTrending.length === 4) {
        break;
      }
    }

    // 4. Format the 4 unwatched trending movies
    filteredTrending.forEach((movie, i) => {
      const n = i + 1;

      text["MOVIETITLE" + n] = truncate(movie.title, 45);

      const desc = movie.overview || "No description available.";
      text["MOVIEDESCR" + n] = desc.length > 130 ? desc.substring(0, 127) + "..." : desc;

      if (movie.poster) {
        const posterUrl = "https://simkl.in/posters/" + movie.poster + "_m.jpg";
        const posterBlob = fetchImageBlob(posterUrl);
        if (posterBlob) images["COVER_MOVIE" + n] = posterBlob;
      }
    });

  } catch (e) {
    text.MOVIETITLE1 = "Movies unavailable";
    text.MOVIEDESCR1 = "API Error: " + e.message;
  }

  return { text, images };
}

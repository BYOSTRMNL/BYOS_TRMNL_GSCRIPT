/**
 * Gathers the next 10 TV show episodes to watch from SIMKL.
 * Populates TVTITLE, TVNB, EPISODETITLE, TVDESCR, and COVER_TV image blobs.
 */
function gatherTV() {
  const text = {};
  const images = {};

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const clientId = scriptProperties.getProperty('SIMKL_CLIENT_ID');
    const accessToken = scriptProperties.getProperty('SIMKL_ACCESS_TOKEN');

    if (!clientId || !accessToken) {
      throw new Error("Missing credentials in Script Properties.");
    }

    const url = `https://api.simkl.com/sync/all-items/shows/watching?next_watch_info=yes&client_id=${clientId}`;

    const options = {
      method: "get",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "simkl-api-key": clientId,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`API returned HTTP status ${response.getResponseCode()}`);
    }

    const data = JSON.parse(response.getContentText());
    const shows = data.shows || [];

    let upcomingEpisodes = shows
      .filter(item => item.next_to_watch_info)
      .map(item => {
        const nextInfo = item.next_to_watch_info;
        const lastWatched = item.last_watched_at ? new Date(item.last_watched_at) : new Date(0);

        return {
          showTitle: item.show ? item.show.title : "Unknown Title",
          season: nextInfo.season,
          episode: nextInfo.episode,
          episodeTitle: nextInfo.title || "TBA",
          poster: item.show ? item.show.poster : null,
          overview: nextInfo.overview || (item.show ? item.show.overview : null),
          lastWatchedAt: lastWatched
        };
      });

    upcomingEpisodes.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);

    const top10TV = upcomingEpisodes.slice(0, 10);

    top10TV.forEach((item, i) => {
      const n = i + 1;

      // 1. TVTITLE
      text["TVTITLE" + n] = truncate(item.showTitle, 45);

      // 2. TVNB
      const seasonCode = String(item.season).padStart(2, '0');
      const episodeCode = String(item.episode).padStart(2, '0');
      text["TVNB" + n] = `S${seasonCode}E${episodeCode}`;

      // 3. EPISODETITLE
      text["EPISODETITLE" + n] = truncate(item.episodeTitle, 45);

      // 4. Description
      const desc = item.overview || "No description available.";
      text["TVDESCR" + n] = desc.length > 130 ? desc.substring(0, 127) + "..." : desc;

      // 5. COVER_TV
      if (item.poster) {
        const posterUrl = "https://simkl.in/posters/" + item.poster + "_m.jpg";
        const posterBlob = fetchImageBlob(posterUrl);
        if (posterBlob) {
          images["COVER_TV" + n] = posterBlob;
          Logger.log(`[OK] COVER_TV${n} loaded for: ${item.showTitle}`);
        } else {
          Logger.log(`[FAIL] fetchImageBlob returned null for COVER_TV${n} (${item.showTitle})`);
        }
      } else {
        Logger.log(`[MISSING] No poster available for COVER_TV${n} (${item.showTitle})`);
      }
    });

  } catch (e) {
    text.TVTITLE1 = "TV Shows unavailable";
    text.TVDESCR1 = "API Error: " + e.message;
  }

  return { text, images };
}

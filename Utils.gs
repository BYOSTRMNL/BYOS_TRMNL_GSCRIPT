// ============================================================
// TRMNL BYOS - Shared Utility Functions
// ============================================================
// Slides rendering to PNG, Drive publication, image element replacement,
// and general helper functions used across all screen modules.
// ============================================================

/**
 * Duplicates the template slide, replaces text placeholders and image placeholders,
 * exports the slide as a PNG blob, and cleans up the duplicated slide.
 */
function renderSlideWithData(slideId, textReplacements, imageReplacements) {
  const presId = PROPS.getProperty("TEMPLATE_PRESENTATION_ID");
  let pres = SlidesApp.openById(presId);
  const templateSlide = pres.getSlides().find(s => s.getObjectId() === slideId);
  if (!templateSlide) throw new Error("Slide not found: " + slideId);

  const workingSlide = templateSlide.duplicate();
  const workingSlideId = workingSlide.getObjectId();

  // Replace text placeholders {{TAG_NAME}}
  Object.keys(textReplacements || {}).forEach(tag => {
    workingSlide.replaceAllText("{{" + tag + "}}", String(textReplacements[tag]));
  });

  // Inject image replacements based on element Alt Text (Description)
  insertImageReplacements(workingSlide, imageReplacements || {});

  // IMPORTANT: Save and close before calling the Advanced Slides API so
  // it recognizes the newly duplicated slide page object.
  pres.saveAndClose();

  // Use try/finally block to guarantee the duplicated working slide is ALWAYS deleted,
  // even if thumbnail rendering or network fetching fails mid-execution.
  try {
    const thumbInfo = Slides.Presentations.Pages.getThumbnail(presId, workingSlideId, {
      "thumbnailProperties.mimeType": "PNG",
      "thumbnailProperties.thumbnailSize": "LARGE"
    });
    return UrlFetchApp.fetch(thumbInfo.contentUrl).getBlob().setName("screen.png");
  } finally {
    const cleanupPres = SlidesApp.openById(presId);
    const toDelete = cleanupPres.getSlides().find(s => s.getObjectId() === workingSlideId);
    if (toDelete) toDelete.remove();
    cleanupPres.saveAndClose();
  }
}

/**
 * Replaces target placeholder elements (identified by Alt Text / Description, e.g. "COVER_MOVIE1")
 * with the corresponding image blob, matching the position and bounding dimensions.
 * Works on any element shape (Images, Rectangles, Textboxes).
 */
function insertImageReplacements(workingSlide, images) {
  if (Object.keys(images).length === 0) return;

  workingSlide.getPageElements().forEach(el => {
    const tag = el.getDescription();
    if (!tag || !images[tag]) return;

    const left = el.getLeft(), top = el.getTop();
    const width = el.getWidth(), height = el.getHeight();
    el.remove();
    workingSlide.insertImage(images[tag], left, top, width, height);
  });
}

/**
 * Publishes the rendered slide PNG image to Google Drive and returns the Cloudflare Worker proxy URL.
 * Automatically trashes previous rendered image files for this screen to prevent storage clutter.
 */
function publishToDrive(blob, screen) {
  const oldIdKey = "FILE_ID_" + screen;
  const oldId = PROPS.getProperty(oldIdKey);
  if (oldId) {
    try { DriveApp.getFileById(oldId).setTrashed(true); } catch (err) { /* Ignored if already removed */ }
  }

  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  PROPS.setProperty(oldIdKey, fileId);

  // Cloudflare Worker domain endpoint route
  // Replace with your custom Cloudflare Worker deployment domain
  const workerDomain = "https://YOUR_CLOUDFLARE_WORKER.subdomain.workers.dev";
  
  return workerDomain + "/render?fileId=" + fileId;
}

/**
 * Helper to fetch external images safely as Blob objects.
 * Fails silently by returning null if network fetch fails.
 */
function fetchImageBlob(url) {
  try {
    return UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }).getBlob();
  } catch (e) {
    return null;
  }
}

/**
 * Helper string truncation function.
 */
function truncate(str, maxLen) {
  if (!str) return "";
  return str.length > maxLen ? str.substring(0, maxLen - 1) + "…" : str;
}

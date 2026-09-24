/**
 * Turns a short product video into an evenly-spaced set of still frames, so a
 * vendor can shoot one clip instead of taking (and uploading) two dozen
 * individual photos.
 *
 * Runs entirely in the browser: an off-screen <video> is seeked to N evenly
 * spaced timestamps and each frame is painted to a <canvas> and read back as a
 * JPEG. The frames it returns are ordinary File objects, so they go through the
 * exact same upload path as hand-taken photos — nothing downstream changes.
 *
 * Frames pulled off a continuous pan are naturally evenly spaced and
 * consistently framed, which is what makes the spin look smooth; hand-shooting
 * the same number of stills rarely is.
 */

export interface ExtractVideoFramesOptions {
  /** How many frames to pull out of the clip. */
  frameCount: number;
  /** Longest edge of each frame, in pixels. Keeps upload sizes sane. */
  maxEdge?: number;
  /** JPEG quality, 0-1. */
  quality?: number;
  /** Called after each frame, for a progress bar. */
  onProgress?: (done: number, total: number) => void;
}

const DEFAULT_MAX_EDGE = 1400;
const DEFAULT_QUALITY = 0.82;
/** Seeking to exactly `duration` lands past the last frame in some browsers. */
const END_SAFETY = 0.02;
/** A single seek should never hang the whole extraction. */
const SEEK_TIMEOUT_MS = 10000;

function waitForEvent(el: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Video "${event}" timed out — try a shorter or smaller clip.`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      el.removeEventListener(event, onDone);
      el.removeEventListener("error", onError);
    }
    function onDone() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error("That video couldn't be read. Try an MP4 recorded on your phone."));
    }

    el.addEventListener(event, onDone, { once: true });
    el.addEventListener("error", onError, { once: true });
  });
}

export async function extractVideoFrames(
  file: File,
  { frameCount, maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY, onProgress }: ExtractVideoFramesOptions,
): Promise<File[]> {
  if (typeof document === "undefined") throw new Error("Frame extraction needs a browser.");

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Keep it out of the layout but still decodable.
  video.style.position = "fixed";
  video.style.left = "-10000px";
  video.style.width = "1px";
  video.style.height = "1px";
  document.body.appendChild(video);

  try {
    await waitForEvent(video, "loadedmetadata", SEEK_TIMEOUT_MS);

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration || duration <= 0) {
      throw new Error("Couldn't read the video length. Try an MP4 recorded on your phone.");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Couldn't read the video size. Try a different clip.");
    }

    // Some browsers won't serve frames until playback has been kicked once.
    try {
      await video.play();
      video.pause();
    } catch {
      // Autoplay refusal is fine — seeking usually still works.
    }
    video.currentTime = 0;

    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't prepare the frames.");

    const usable = Math.max(0, duration - END_SAFETY);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "spin";
    const frames: File[] = [];

    for (let i = 0; i < frameCount; i += 1) {
      const target = (i / frameCount) * usable;
      // Re-seeking to the same spot fires no event, so only wait when it moves.
      if (Math.abs(video.currentTime - target) > 0.001) {
        video.currentTime = target;
        await waitForEvent(video, "seeked", SEEK_TIMEOUT_MS);
      }

      ctx.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) throw new Error("Couldn't save one of the frames — try a shorter clip.");

      const index = String(i + 1).padStart(2, "0");
      frames.push(new File([blob], `${baseName}-${index}.jpg`, { type: "image/jpeg" }));
      onProgress?.(i + 1, frameCount);
    }

    return frames;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fallbackContent, loadCmsContent, type PortfolioContent, type Project } from "./data";

// Where a video of the given aspect ratio sits when letterboxed/pillarboxed
// inside a box, in percentages of that box.
function fitRect(videoAspect: number, boxAspect: number) {
  if (videoAspect > boxAspect) {
    const height = (boxAspect / videoAspect) * 100;
    return { left: 0, top: (100 - height) / 2, width: 100, height };
  }
  const width = (videoAspect / boxAspect) * 100;
  return { left: (100 - width) / 2, top: 0, width, height: 100 };
}

let measureProbe: HTMLSpanElement | null = null;
// Canvas measureText ignores letter-spacing (and can resolve condensed font
// stacks differently than the DOM), so measure with a real hidden element
// styled to match instead — the only way to get the true rendered width.
function measureRenderedWidth(text: string, referenceStyle: CSSStyleDeclaration) {
  measureProbe ??= document.body.appendChild(document.createElement("span"));
  Object.assign(measureProbe.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "nowrap",
    fontFamily: referenceStyle.fontFamily,
    fontSize: referenceStyle.fontSize,
    fontWeight: referenceStyle.fontWeight,
    fontStretch: referenceStyle.fontStretch,
    letterSpacing: referenceStyle.letterSpacing,
  });
  measureProbe.textContent = text;
  return measureProbe.getBoundingClientRect().width;
}

function VideoTile({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const dimensions = useRef<{ width?: number; height?: number }>({});
  const dimensionPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  const projectNameRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  const [tileCursor, setTileCursor] = useState({ x: 0, y: 0 });
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [projectNameText, setProjectNameText] = useState(project.projectName);

  // Mobile only (matches the max-width:700px breakpoint used everywhere
  // else). The span shrinks to fit its own content, so comparing its
  // width against itself is circular — compare against 48% of the
  // stable parent width instead (the space each side actually gets),
  // and drop the last word only when the full name would truly overflow.
  useLayoutEffect(() => {
    const el = projectNameRef.current;
    if (!el || !project.projectName) return;
    const words = project.projectName.trim().split(/\s+/);
    const shortText = words.length > 1 ? words.slice(0, -1).join(" ") : project.projectName;

    const checkFit = () => {
      const isMobile = window.matchMedia("(max-width: 700px)").matches;
      if (!isMobile || !el.parentElement) {
        setProjectNameText(project.projectName);
        return;
      }
      const available = el.parentElement.clientWidth * 0.48;
      const fullWidth = measureRenderedWidth(project.projectName!, getComputedStyle(el));
      setProjectNameText(fullWidth > available ? shortText : project.projectName);
    };

    checkFit();
    window.addEventListener("resize", checkFit);
    return () => window.removeEventListener("resize", checkFit);
  }, [project.projectName]);

  const send = (method: string, value?: number) => {
    frame.current?.contentWindow?.postMessage(
      value === undefined ? { method } : { method, value },
      "https://player.vimeo.com",
    );
  };

  const stopDimensionPoll = () => {
    if (dimensionPoll.current) {
      clearInterval(dimensionPoll.current);
      dimensionPoll.current = null;
    }
  };

  // The Vimeo player iframe fires its own "load" before the player app
  // inside has finished initializing, so a dimensions request sent right
  // then can arrive before anything is listening and gets dropped silently.
  // Retry for a few seconds instead of asking once.
  const requestDimensions = () => {
    const hasDimensions = dimensions.current.width && dimensions.current.height;
    if (hasDimensions) {
      stopDimensionPoll();
      return;
    }
    send("getVideoWidth");
    send("getVideoHeight");
  };

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== frame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.method === "getVideoWidth" && Number.isFinite(data.value)) dimensions.current.width = data.value;
        if (data?.method === "getVideoHeight" && Number.isFinite(data.value)) dimensions.current.height = data.value;
        if (dimensions.current.width && dimensions.current.height) {
          setVideoAspect(dimensions.current.width / dimensions.current.height);
          stopDimensionPoll();
        }
      } catch { /* Ignore unrelated player messages. */ }
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      stopDimensionPoll();
    };
  }, []);

  // Covers the square tile regardless of the source video's orientation, the
  // same math as CSS background-size: cover, applied to the iframe box.
  // Falls back to the 16:9 default (matching the stylesheet) until the
  // player reports the real dimensions.
  const coverStyle = videoAspect
    ? videoAspect >= 1
      ? { width: `${videoAspect * 100}%`, height: "100%" }
      : { width: "100%", height: `${(1 / videoAspect) * 100}%` }
    : undefined;

  const trackCursor = (event: React.MouseEvent<HTMLElement>) => {
    setTileCursor({ x: event.clientX, y: event.clientY });
  };

  return (
    <article
      className="project-tile"
      style={{ "--accent": project.accent } as React.CSSProperties}
      onMouseEnter={() => {
        setActive(true);
        preview.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setActive(false);
        const el = preview.current;
        if (el) { el.pause(); el.currentTime = 0; }
      }}
      onMouseMove={trackCursor}
    >
      <button className="tile-hit" onClick={onOpen} aria-label={`Play ${project.title}`}>
        {project.thumbnailUrl ? (
          // No Vimeo iframe at all here — it would only ever exist to
          // supply the aspect ratio for coverStyle below, but the thumbnail
          // already covers the tile on its own via CSS object-fit. Loading
          // a full Vimeo player per tile just to sit permanently hidden
          // behind the thumbnail was pure wasted bandwidth; the real video
          // only needs to load once someone actually opens the viewer.
          <img src={project.thumbnailUrl} alt="" className="tile-thumbnail" />
        ) : (
          <iframe
            ref={frame}
            src={`https://player.vimeo.com/video/${project.vimeoId}?${project.vimeoHash ? `h=${project.vimeoHash}&` : ""}autoplay=0&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1`}
            title={`${project.title} preview`}
            allow="autoplay; fullscreen; picture-in-picture"
            loading="lazy"
            style={coverStyle}
            onLoad={() => {
              requestDimensions();
              stopDimensionPoll();
              dimensionPoll.current = setInterval(requestDimensions, 250);
              setTimeout(stopDimensionPoll, 4000);
            }}
          />
        )}
        {project.hoverPreviewUrl && (
          <video
            ref={preview}
            src={project.hoverPreviewUrl}
            className={`tile-preview ${active ? "visible" : ""}`}
            muted
            loop
            playsInline
            preload="none"
          />
        )}
        <span className="tile-shade" />
      </button>
      <span
        className={`tile-cursor ${active ? "visible" : ""}`}
        style={{ transform: `translate3d(${tileCursor.x}px, ${tileCursor.y}px, 0) translateY(-50%)` }}
        aria-hidden="true"
      >
        PLAY
      </span>
      <div className="tile-meta">
        {project.client && project.projectName ? (
          <h3 className="tile-meta-split"><span>{project.client}</span><span ref={projectNameRef}>{projectNameText}</span></h3>
        ) : (
          <h3>{project.title}</h3>
        )}
      </div>
    </article>
  );
}

// initialContent is the Site Settings the server already fetched, so the
// hero's video URLs are in the very first HTML and start downloading with
// the page. null means the server couldn't reach Sanity in time; the
// browser then falls back to fetching it itself, as before.
export default function Portfolio({ initialContent, initialIsMobile }: { initialContent: PortfolioContent | null; initialIsMobile: boolean }) {
  const [content, setContent] = useState(initialContent ?? fallbackContent);
  const [contentReady, setContentReady] = useState(initialContent !== null);
  const [category, setCategory] = useState((initialContent ?? fallbackContent).sections[0].id);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [viewerPlaying, setViewerPlaying] = useState(false);
  const [viewerAtEdge, setViewerAtEdge] = useState(false);
  const [viewerDimensions, setViewerDimensions] = useState({ width: 16, height: 9 });
  const [viewerProgress, setViewerProgress] = useState({ seconds: 0, duration: 0 });
  const [videoRect, setVideoRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [dimensionsKnown, setDimensionsKnown] = useState(false);
  const [viewerFullscreen, setViewerFullscreen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [dragSettling, setDragSettling] = useState(false);
  const [viewerSlide, setViewerSlide] = useState<"next" | "prev" | null>(null);
  const [viewerFrameReady, setViewerFrameReady] = useState(false);
  const [peekBoxAspect, setPeekBoxAspect] = useState(375 / 598);
  const [vimeoThumbs, setVimeoThumbs] = useState<Record<string, { url: string; aspect: number }>>({});
  const thumbRequests = useRef(new Set<string>());
  const [mobileVideoBottom, setMobileVideoBottom] = useState<number | null>(null);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [animationMinDone, setAnimationMinDone] = useState(false);
  const [isMobileHero, setIsMobileHero] = useState(initialIsMobile);
  const [heroFileFailed, setHeroFileFailed] = useState(false);
  const [heroCursor, setHeroCursor] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [cursorSuppressed, setCursorSuppressed] = useState(false);
  const heroFrame = useRef<HTMLIFrameElement>(null);
  const heroPlaceholder = useRef<HTMLVideoElement>(null);
  const heroFile = useRef<HTMLVideoElement>(null);
  const reelHeld = useRef(false);
  const viewerFrame = useRef<HTMLIFrameElement>(null);
  const viewerMedia = useRef<HTMLDivElement>(null);
  const viewerRoot = useRef<HTMLDivElement>(null);
  const fullscreenRetryOnPlay = useRef(false);
  const swipeStart = useRef<{ x: number; y: number; t: number; horizontal: boolean } | null>(null);
  const lastSwipeAt = useRef(0);
  const activeSection = content.sections.find((section) => section.id === category) || content.sections[0];
  const visible = activeSection?.projects || [];
  // Only ever swaps in on a touch device with a coarse pointer (see the
  // isMobileHero layout effect) — desktop always uses content.homepageReel,
  // unchanged. Falls back to the main reel if no mobile-specific one is set.
  const heroReel = isMobileHero && content.homepageReelMobile ? content.homepageReelMobile : content.homepageReel;
  // Plays the CMS video file for this device directly when one is set,
  // skipping Vimeo's iframe/player/config round trips entirely. Falls back
  // to the Vimeo iframe if the file is missing or fails.
  const heroFileUrl = heroFileFailed
    ? undefined
    : isMobileHero ? content.homepageReelMobileVideoUrl : content.homepageReelVideoUrl;
  // On phones the loading animation only fronts the native reel file; the
  // Vimeo fallback there keeps showing the reel directly, as before.
  const loadingAnimationUrl = isMobileHero
    ? heroFileUrl ? content.loadingAnimationMobileUrl : undefined
    : content.loadingAnimationDesktopUrl;
  // Once the animation is actually on screen, keep it up for at least
  // 1.5s even if the reel is ready sooner, so a quick flash doesn't look
  // like a glitch. If the reel is ready before the animation ever started
  // playing, skip it rather than hold the reel back.
  const hideAnimation = heroReady && (!animationPlaying || animationMinDone);

  useEffect(() => {
    if (initialContent) return;
    const controller = new AbortController();
    loadCmsContent(controller.signal)
      .then((nextContent) => {
        setContent(nextContent);
        setCategory((current) => nextContent.sections.some((section) => section.id === current) ? current : nextContent.sections[0].id);
      })
      .catch(() => { /* Keep the built-in content if Sanity is unavailable. */ })
      .finally(() => setContentReady(true));
    return () => controller.abort();
  }, [initialContent]);

  // Loaded after mount instead of in the document head, so it doesn't
  // compete with the hero reel for bandwidth during initial load — it's
  // only used by the About section, well below the fold, so there's no
  // rush to have it before the page even paints.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500&display=swap";
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  const close = useCallback(() => {
    setViewerIndex(null);
    setViewerPlaying(false);
  }, []);
  const move = useCallback((direction: number) => {
    setViewerPlaying(false);
    // Defaults to the windowed (zoomed-out) view on navigation rather than
    // full-bleed — it only zooms in once the mouse actually moves away from
    // the edge zone, instead of assuming the cursor is already centered.
    // Not on touch: there's no cursor to move away, so the frame stayed
    // shrunk and the next tap closed the viewer instead of playing.
    setViewerAtEdge(!isMobileHero);
    // Cleared here, synchronously with the index change, rather than only in
    // the dimensions-reset effect that follows — otherwise the previous
    // video's rect (or dimensions-reset effect racing against the rect
    // effect on the same render) briefly persists into the new video's
    // first render, flashing the progress bar/fullscreen button in the
    // wrong spot before the new aspect ratio is measured.
    setVideoRect(null);
    setDimensionsKnown(false);
    setViewerIndex((current) => current === null ? null : (current + direction + visible.length) % visible.length);
  }, [visible.length, isMobileHero]);

  // Phone navigation (bottom bar and swipe): same as move(), plus the new
  // project slides in from the side it came from.
  const goTo = useCallback((direction: number) => {
    setViewerSlide(direction > 0 ? "next" : "prev");
    move(direction);
  }, [move]);

  const sendToViewer = useCallback((method: "play" | "pause") => {
    viewerFrame.current?.contentWindow?.postMessage({ method }, "https://player.vimeo.com");
  }, []);

  const requestViewerDimensions = useCallback(() => {
    const player = viewerFrame.current?.contentWindow;
    player?.postMessage({ method: "getVideoWidth" }, "https://player.vimeo.com");
    player?.postMessage({ method: "getVideoHeight" }, "https://player.vimeo.com");
  }, []);

  useEffect(() => {
    if (viewerIndex === null) return;
    setViewerDimensions({ width: 16, height: 9 });
    setVideoRect(null);
    setDimensionsKnown(false);
    setViewerProgress({ seconds: 0, duration: 0 });
    setViewerFrameReady(false);
    // Backstop so the player is never left hidden behind its poster if
    // Vimeo's "ready" message doesn't arrive.
    const revealFrame = window.setTimeout(() => setViewerFrameReady(true), 4000);
    let widthKnown = false;
    let heightKnown = false;

    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== viewerFrame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "ready") {
          setViewerFrameReady(true);
          requestViewerDimensions();
          viewerFrame.current?.contentWindow?.postMessage({ method: "addEventListener", value: "timeupdate" }, "https://player.vimeo.com");
          viewerFrame.current?.contentWindow?.postMessage({ method: "addEventListener", value: "play" }, "https://player.vimeo.com");
        }
        // iPhone refuses full screen for a video that hasn't started yet, so
        // a request made from a paused video is repeated the moment it starts.
        if (data?.event === "play" && fullscreenRetryOnPlay.current) {
          fullscreenRetryOnPlay.current = false;
          viewerFrame.current?.contentWindow?.postMessage({ method: "requestFullscreen" }, "https://player.vimeo.com");
        }
        if (data?.method === "getVideoWidth" && Number.isFinite(data.value)) {
          setViewerDimensions((dimensions) => ({ ...dimensions, width: data.value }));
          widthKnown = true;
        }
        if (data?.method === "getVideoHeight" && Number.isFinite(data.value)) {
          setViewerDimensions((dimensions) => ({ ...dimensions, height: data.value }));
          heightKnown = true;
        }
        // Both dimensions land in separate messages, so only trust
        // viewerDimensions for layout once both real values are in — the
        // {16, 9} placeholder it starts at otherwise computes a rect for
        // the wrong aspect ratio and flashes it before the real one arrives.
        if (widthKnown && heightKnown) setDimensionsKnown(true);
        if (data?.event === "timeupdate" && data.data) {
          setViewerProgress({ seconds: data.data.seconds, duration: data.data.duration });
        }
      } catch { /* Ignore unrelated player messages. */ }
    };

    const retry = window.setTimeout(requestViewerDimensions, 500);
    window.addEventListener("message", receive);
    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(revealFrame);
      window.removeEventListener("message", receive);
    };
  }, [viewerIndex, requestViewerDimensions]);

  // Phones: fetch Vimeo's own poster frame (and the video's shape) for the
  // open project and its neighbours, so the swipe preview and the moment
  // before the player loads show the real frame, not the square grid
  // thumbnail. Vimeo's public oEmbed lookup covers unlisted videos too.
  useEffect(() => {
    if (viewerIndex === null || !isMobileHero || !visible.length) return;
    for (const offset of [0, 1, -1]) {
      const project = visible[(viewerIndex + offset + visible.length) % visible.length];
      if (thumbRequests.current.has(project.vimeoId)) continue;
      thumbRequests.current.add(project.vimeoId);
      const vimeoUrl = `https://vimeo.com/${project.vimeoId}${project.vimeoHash ? `/${project.vimeoHash}` : ""}`;
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}&width=1280`)
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((data: { thumbnail_url?: string; width?: number; height?: number }) => {
          if (!data.thumbnail_url || !data.width || !data.height) return;
          new Image().src = data.thumbnail_url;
          setVimeoThumbs((thumbs) => ({ ...thumbs, [project.vimeoId]: { url: data.thumbnail_url!, aspect: data.width! / data.height! } }));
        })
        .catch(() => thumbRequests.current.delete(project.vimeoId));
    }
  }, [viewerIndex, isMobileHero, visible]);

  // The video letterboxes/pillarboxes inside .viewer-media whenever its
  // aspect ratio doesn't match the container's, so the progress bar and
  // fullscreen button (which need to hug the video's own edges, not the
  // container's) have to be positioned against the actual rendered video
  // rectangle rather than the fixed-inset box around it.
  //
  // This is expressed in PERCENTAGES of .viewer-media, not pixels, and
  // that's deliberate: zooming in/out changes .viewer-media's inset by the
  // same 7.5vh/7.5vw on every side, which scales its width and height by
  // the same factor and so never changes its aspect ratio — meaning the
  // letterboxed video's position as a percentage of the container is
  // IDENTICAL whether zoomed in or out. A percentage-based rect therefore
  // tracks .viewer-media's own CSS transition natively, every frame, with
  // no JS involved in the animation at all. (An earlier pixel-based
  // version had to re-measure on a timer/transitionend and always lagged
  // a frame behind, snapping into place instead of animating smoothly.)
  useEffect(() => {
    if (viewerIndex === null || !dimensionsKnown) return;
    const updateVideoRect = () => {
      const media = viewerMedia.current;
      const videoAspect = viewerDimensions.width / viewerDimensions.height;
      if (!media || !Number.isFinite(videoAspect) || videoAspect <= 0) return;
      // offsetWidth/Height ignore the transform applied while swiping.
      const bounds = { top: media.getBoundingClientRect().top, width: media.offsetWidth, height: media.offsetHeight };
      const rect = fitRect(videoAspect, bounds.width / bounds.height);
      setVideoRect(rect);
      setMobileVideoBottom(bounds.top + (rect.top / 100) * bounds.height + (rect.height / 100) * bounds.height);
    };
    updateVideoRect();
    window.addEventListener("resize", updateVideoRect);
    window.addEventListener("orientationchange", updateVideoRect);
    return () => {
      window.removeEventListener("resize", updateVideoRect);
      window.removeEventListener("orientationchange", updateVideoRect);
    };
  }, [viewerIndex, viewerDimensions, dimensionsKnown]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement === viewerRoot.current;
      setViewerFullscreen(isFullscreen);
      if (!isFullscreen) screen.orientation?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    const root = viewerRoot.current;
    if (root && document.fullscreenEnabled && typeof root.requestFullscreen === "function") {
      root.requestFullscreen()
        .then(() => {
          // Android: turn landscape projects sideways like a native player.
          const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void> };
          if (isMobileHero && viewerDimensions.width > viewerDimensions.height) orientation?.lock?.("landscape").catch(() => {});
        })
        .catch(() => {});
      return;
    }
    // iPhone Safari can't make page elements full screen, but Vimeo's player
    // can open the native iPhone player. That's refused while the video is
    // still paused, so start it too, and ask again once it's playing (see
    // the "play" handler above). If it still doesn't open, a second press
    // will, since the video is playing by then.
    const player = viewerFrame.current?.contentWindow;
    if (!viewerPlaying) {
      fullscreenRetryOnPlay.current = true;
      window.setTimeout(() => { fullscreenRetryOnPlay.current = false; }, 3000);
      player?.postMessage({ method: "play" }, "https://player.vimeo.com");
      setViewerPlaying(true);
    }
    player?.postMessage({ method: "requestFullscreen" }, "https://player.vimeo.com");
  }, [isMobileHero, viewerDimensions, viewerPlaying]);

  const onViewerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileHero || event.touches.length !== 1) return;
    if ((event.target as Element).closest(".viewer-progress, .viewer-fullscreen, .viewer-mobile-bar, .viewer-top")) return;
    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY, t: performance.now(), horizontal: false };
    const media = viewerMedia.current;
    if (media) setPeekBoxAspect(media.offsetWidth / media.offsetHeight);
  };

  const onViewerTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        start.horizontal = true;
      } else {
        if (Math.abs(dy) > 10) swipeStart.current = null;
        return;
      }
    }
    setDragSettling(false);
    setDragX(dx);
  };

  // Past a third of the screen (or a quick flick) goes to the neighbouring
  // project; otherwise it springs back.
  const onViewerTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start?.horizontal) return;
    lastSwipeAt.current = performance.now();
    const dx = event.changedTouches[0].clientX - start.x;
    const width = window.innerWidth;
    const flick = Math.abs(dx) > 40 && Math.abs(dx) / (performance.now() - start.t) > 0.5;
    setDragSettling(true);
    if (Math.abs(dx) > width / 3 || flick) {
      setDragX(dx < 0 ? -width : width);
      window.setTimeout(() => {
        setDragSettling(false);
        setDragX(null);
        goTo(dx < 0 ? 1 : -1);
      }, 200);
    } else {
      setDragX(0);
      window.setTimeout(() => {
        setDragSettling(false);
        setDragX(null);
      }, 220);
    }
  };

  const seekViewer = useCallback((clientX: number, bounds: DOMRect) => {
    if (!viewerProgress.duration) return;
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const target = ratio * viewerProgress.duration;
    viewerFrame.current?.contentWindow?.postMessage({ method: "setCurrentTime", value: target }, "https://player.vimeo.com");
    setViewerProgress((progress) => ({ ...progress, seconds: target }));
  }, [viewerProgress.duration]);

  const startSeek = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    seekViewer(event.clientX, bounds);
    const onMove = (moveEvent: PointerEvent) => seekViewer(moveEvent.clientX, bounds);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const toggleViewer = useCallback(() => {
    if (viewerPlaying) {
      sendToViewer("pause");
      setViewerPlaying(false);
    } else {
      sendToViewer("play");
      setViewerPlaying(true);
    }
  }, [sendToViewer, viewerPlaying]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (viewerIndex === null) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === " ") {
        event.preventDefault();
        toggleViewer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIndex, close, move, toggleViewer]);

  // Deliberately horizontal-only (ignores clientY): the progress bar and
  // fullscreen button live at the bottom of the frame, so if closing,
  // zooming, or the credit/counter fade also reacted to vertical position,
  // reaching down for those controls would trigger all of that at the same
  // time — a moving target right when precision matters most.
  const trackViewerCursor = (event: React.MouseEvent<HTMLDivElement>) => {
    // Taps on touch screens also fire mouse events; edge-to-close is a
    // desktop cursor behavior.
    if (isMobileHero) return;
    const bounds = viewerMedia.current?.getBoundingClientRect();
    const videoAspect = viewerDimensions.width / viewerDimensions.height;
    // The bottom 5% of the screen is a dead zone for this: it's where the
    // progress bar and fullscreen button live, and without this, scrubbing
    // to either end of the bar would still cross into the horizontal edge
    // trigger and zoom/close the frame out from under the cursor.
    const inControlZone = event.clientY > window.innerHeight * 0.95;
    let atEdge = false;

    if (!inControlZone && bounds && Number.isFinite(videoAspect) && videoAspect > 0) {
      const containerAspect = bounds.width / bounds.height;
      const innerTrigger = Math.min(48, window.innerWidth * 0.03);
      // Pillarboxed video: its real left/right edges sit inside the frame,
      // not at the frame's own edges. Otherwise (video fills the frame's
      // full width) the video's edges are the frame's own edges.
      let videoLeft = bounds.left;
      let videoRight = bounds.right;
      if (videoAspect < containerAspect) {
        const videoWidth = bounds.height * videoAspect;
        videoLeft = bounds.left + (bounds.width - videoWidth) / 2;
        videoRight = videoLeft + videoWidth;
      }
      atEdge = event.clientX < videoLeft + innerTrigger || event.clientX > videoRight - innerTrigger;
    }

    setViewerAtEdge(atEdge);
    setCursor({ x: event.clientX, y: event.clientY, visible: true });
  };

  const choose = (next: string) => {
    setCategory(next);
    setShowWork(true);
    requestAnimationFrame(() => document.querySelector("#work")?.scrollIntoView({ behavior: "smooth" }));
  };

  const current = viewerIndex === null ? null : visible[viewerIndex];

  // The server guesses phone vs. desktop from the user agent so the right
  // hero is already in the HTML; this corrects the rare wrong guess (e.g.
  // iPads, which report a desktop user agent). Done in a layout effect, not
  // at render time, so it can't cause a hydration mismatch, and it fires
  // before paint so there's no flash.
  useLayoutEffect(() => {
    setIsMobileHero(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Browsers correctly pause backgrounded video when a tab isn't visible —
  // switching apps, checking a setting, even opening Control Center all
  // trigger this. Nothing resumes it automatically once the page is visible
  // again, so without this it stays frozen forever at whatever frame it was
  // on, which is exactly the "stuck mid-video" bug reported on mobile.
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      if (!reelHeld.current) heroFrame.current?.contentWindow?.postMessage({ method: "play" }, "https://player.vimeo.com");
      if (heroPlaceholder.current?.paused) heroPlaceholder.current.play().catch(() => {});
      if (heroFile.current?.paused && !reelHeld.current) heroFile.current.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, []);

  // Deliberately no autoPlay attribute: that's the mechanism behind the
  // ugly "blocked, tap to retry" button some phones show when native
  // autoplay is disallowed. Starting playback via script instead means a
  // blocked attempt just fails silently, leaving the video on its first
  // frame — a graceful still-image fallback instead of a stuck button.
  // Also explicitly sets the muted attribute (not just the DOM property,
  // which is all React's muted prop reliably sets) right before playing,
  // since muted+playsinline is exactly what Apple's own autoplay
  // allowance is meant to cover.
  useEffect(() => {
    const el = heroPlaceholder.current;
    if (!el) return;
    el.muted = true;
    el.setAttribute("muted", "");
    el.play().catch(() => { /* Ignored: worst case it shows a static first frame. */ });
  }, [loadingAnimationUrl]);

  // The loading animation plays almost immediately (a small file, no
  // iframe/player handshake); once Vimeo confirms actual playback has
  // started, cut away to it.
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== heroFrame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "play") setHeroReady(true);
        // autoplay=1 can start (and fire "play") before addEventListener
        // below reaches the player, permanently missing that one-time
        // event — this catches that race by checking current state too.
        if (data?.method === "getPaused" && data.value === false) setHeroReady(true);
      } catch { /* Ignore unrelated player messages. */ }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  const subscribeHeroEvents = () => {
    // Phones only reach the Vimeo iframe as a fallback, with no loading
    // animation in front of it, so there's nothing to cut away from — skip
    // this burst of postMessage traffic rather than let it run for no
    // purpose right as Vimeo is trying to autoplay.
    if (heroReady || isMobileHero) return;
    const player = heroFrame.current?.contentWindow;
    player?.postMessage({ method: "addEventListener", value: "play" }, "https://player.vimeo.com");
    // A single getPaused check can land in the brief paused window before
    // autoplay actually kicks in; poll for a while to reliably catch it.
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      player?.postMessage({ method: "getPaused" }, "https://player.vimeo.com");
      if (attempts >= 25) window.clearInterval(poll);
    }, 200);
    // Safety net: however detection fails (slow network, a browser quirk in
    // postMessage timing, autoplay blocked entirely), the placeholder must
    // never loop forever — force the cut over after a few seconds regardless.
    window.setTimeout(() => setHeroReady(true), 3000);
  };

  // The iframe is in the server HTML, so it can finish loading before React
  // attaches onLoad above, silently skipping subscribeHeroEvents and leaving
  // the loading animation up forever. Also poll from mount (the player just
  // ignores messages sent before it's ready), with a backstop in case onLoad
  // never arrives.
  useEffect(() => {
    if (!contentReady || isMobileHero || heroFileUrl || heroReady) return;
    const poll = window.setInterval(() => {
      heroFrame.current?.contentWindow?.postMessage({ method: "getPaused" }, "https://player.vimeo.com");
    }, 250);
    const backstop = window.setTimeout(() => setHeroReady(true), 8000);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(backstop);
    };
  }, [contentReady, isMobileHero, heroFileUrl, heroReady]);

  // Same approach as the placeholder: no autoPlay attribute (avoids the
  // "blocked, tap to retry" button on some phones), muted attribute set by
  // hand, playback started from script. The loading animation stays in
  // front until the reel fires "playing" (see onPlaying below). If autoplay
  // is blocked (e.g. iPhone Low Power Mode) or the reel is very slow, cut
  // over anyway so the reel's first frame shows instead of a frozen
  // animation.
  useEffect(() => {
    const el = heroFile.current;
    if (!el) return;
    // A load error before hydration never reaches onError below.
    if (el.error) {
      setHeroFileFailed(true);
      return;
    }
    el.muted = true;
    el.setAttribute("muted", "");
    el.play().catch(() => setHeroReady(true));
    const safetyNet = window.setTimeout(() => setHeroReady(true), 10000);
    return () => window.clearTimeout(safetyNet);
  }, [heroFileUrl, contentReady]);

  // The reel still starts (so it buffers — iPhones often won't download a
  // video that hasn't been told to play), but once it's confirmed ready
  // while the loading animation is still up, it's paused on its first frame
  // and only starts when the animation is removed, so nobody misses the
  // opening of the reel behind it.
  useEffect(() => {
    if (!heroReady) return;
    const hold = Boolean(loadingAnimationUrl) && !hideAnimation;
    reelHeld.current = hold;
    const file = heroFile.current;
    const vimeo = heroFrame.current?.contentWindow;
    if (hold) {
      if (file) {
        file.pause();
        file.currentTime = 0;
      }
      // Vimeo's background mode overrides a single pause sent right as its
      // autoplay kicks in, so keep re-sending it while the reel is held.
      // No seek back to 0: in background mode a seek makes it start playing
      // again on its own. It's caught within a fraction of a second of
      // starting, so pausing where it is loses almost nothing.
      if (vimeo) {
        const pause = () => vimeo.postMessage({ method: "pause" }, "https://player.vimeo.com");
        pause();
        const repeat = window.setInterval(pause, 150);
        return () => window.clearInterval(repeat);
      }
    } else {
      file?.play().catch(() => {});
      vimeo?.postMessage({ method: "play" }, "https://player.vimeo.com");
    }
  }, [heroReady, hideAnimation, loadingAnimationUrl]);

  const toggleHeroSound = () => {
    const nextMuted = !heroMuted;
    if (heroFile.current) {
      heroFile.current.muted = nextMuted;
      if (!nextMuted && !reelHeld.current) heroFile.current.play().catch(() => {});
      setHeroMuted(nextMuted);
      return;
    }
    heroFrame.current?.contentWindow?.postMessage(
      { method: "setMuted", value: nextMuted },
      "https://player.vimeo.com",
    );
    heroFrame.current?.contentWindow?.postMessage(
      { method: "setVolume", value: nextMuted ? 0 : 1 },
      "https://player.vimeo.com",
    );
    setHeroMuted(nextMuted);
  };

  // Opening a project mutes the homepage reel so its sound doesn't compete
  // with the project's. It stays muted after closing; the SOUND button
  // shows that, and turns it back on.
  const viewerOpen = viewerIndex !== null;
  useEffect(() => {
    if (!viewerOpen) return;
    if (heroFile.current) heroFile.current.muted = true;
    heroFrame.current?.contentWindow?.postMessage({ method: "setMuted", value: true }, "https://player.vimeo.com");
    heroFrame.current?.contentWindow?.postMessage({ method: "setVolume", value: 0 }, "https://player.vimeo.com");
    setHeroMuted(true);
  }, [viewerOpen]);

  return (
    <main>
      <header className="topbar">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{content.siteTitle}</button>
        <nav aria-label="Main navigation">
          {contentReady && content.sections.map((section) => <button key={section.id} onClick={() => choose(section.id)}>{section.title}</button>)}
          <button onClick={() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" })}>ABOUT</button>
        </nav>
      </header>

      <section
        className="hero"
        aria-label="Featured reel"
        onClick={toggleHeroSound}
        onMouseMove={(event) => setHeroCursor({ x: event.clientX, y: event.clientY })}
      >
        {loadingAnimationUrl && !hideAnimation && (
          <video
            ref={heroPlaceholder}
            className="hero-video hero-placeholder"
            src={loadingAnimationUrl}
            muted
            loop
            playsInline
            aria-hidden="true"
            onClick={(event) => { event.currentTarget.play().catch(() => {}); }}
            onPlaying={() => {
              if (animationPlaying) return;
              setAnimationPlaying(true);
              window.setTimeout(() => setAnimationMinDone(true), 1500);
            }}
          />
        )}
        {/* Waits for contentReady instead of mounting immediately with
            fallbackContent's reel and swapping once Sanity resolves. On a
            fast connection that swap is invisible, but on slow mobile data
            the swap happens well after the iframe has made real progress
            loading the WRONG video — aborting that in-flight load (likely
            the brief Vimeo error some users saw) and restarting Vimeo's
            entire bootstrap chain from zero with the right one, roughly
            doubling the real load time. Mounting once, already knowing the
            final URL, avoids that entirely. */}
        {contentReady && heroFileUrl && (
          <video
            ref={heroFile}
            className="hero-video hero-video-file"
            src={heroFileUrl}
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Maximilian Kelly editors reel"
            onPlaying={() => setHeroReady(true)}
            onError={() => setHeroFileFailed(true)}
          />
        )}
        {contentReady && !heroFileUrl && (
          <iframe
            ref={heroFrame}
            className="hero-video"
            src={`https://player.vimeo.com/video/${heroReel.vimeoId}?${heroReel.vimeoHash ? `h=${heroReel.vimeoHash}&` : ""}background=1&autoplay=1&loop=1&muted=1&autopause=0&playsinline=1&dnt=1`}
            title="Maximilian Kelly editors reel"
            allow="autoplay; fullscreen; picture-in-picture"
            onLoad={subscribeHeroEvents}
          />
        )}
        <button
          className="hero-sound hero-sound-desktop"
          type="button"
          onClick={toggleHeroSound}
          style={{ "--hero-cursor-x": `${heroCursor.x}px`, "--hero-cursor-y": `${heroCursor.y}px` } as React.CSSProperties}
        >
          {heroMuted ? "SOUND ON" : "SOUND OFF"}
        </button>
        <button className="hero-sound hero-sound-mobile" type="button" onClick={toggleHeroSound}>
          {heroMuted ? "SOUND OFF" : "SOUND ON"}
        </button>
      </section>

      <section id="work" className={`work ${showWork ? "revealed" : ""}`}>
        <div className="grid">
          {visible.map((project, index) => <VideoTile key={project.id} project={project} onOpen={() => setViewerIndex(index)} />)}
        </div>
      </section>

      <section id="about" className="about">
        <p className="eyebrow">ABOUT</p>
        <div className="about-layout">
          {content.aboutHeadshotUrl ? (
            <img src={content.aboutHeadshotUrl} alt="" className="about-headshot" />
          ) : (
            <div className="about-headshot" aria-hidden="true" />
          )}
          <div className="about-copy">
            {content.aboutParagraphs.map((paragraph, index) => (
              <p key={index} className="about-paragraph">{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {current && (
        <div
          className={`viewer ${viewerAtEdge ? "at-edge" : ""} ${viewerPlaying ? "is-playing" : ""} ${viewerFrameReady ? "frame-ready" : ""}`}
          data-orientation={viewerDimensions.width >= viewerDimensions.height ? "horizontal" : "vertical"}
          style={{ "--mobile-credit-top": mobileVideoBottom !== null ? `${mobileVideoBottom}px` : undefined } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-label={`${current.title} video player`}
          onMouseMove={trackViewerCursor}
          onMouseLeave={() => setCursor((position) => ({ ...position, visible: false }))}
          onClick={() => {
            if (performance.now() - lastSwipeAt.current < 400) return;
            if (viewerAtEdge) close(); else toggleViewer();
          }}
          onTouchStart={onViewerTouchStart}
          onTouchMove={onViewerTouchMove}
          onTouchEnd={onViewerTouchEnd}
          onTouchCancel={() => { swipeStart.current = null; setDragX(null); setDragSettling(false); }}
          ref={viewerRoot}
        >
          <div
            className={`viewer-media ${dragSettling ? "settling" : ""} ${viewerSlide ? `slide-${viewerSlide}` : ""}`}
            style={dragX !== null ? { transform: `translateX(${dragX}px)` } : undefined}
            onAnimationEnd={() => setViewerSlide(null)}
            ref={viewerMedia}
          >
            {dragX !== null && ([["prev", -1], ["next", 1]] as const).map(([side, offset]) => {
              const neighbour = visible[(viewerIndex! + offset + visible.length) % visible.length];
              const thumb = vimeoThumbs[neighbour.vimeoId];
              // Placed exactly where that video will sit once it loads.
              const frame = fitRect(thumb?.aspect ?? 16 / 9, peekBoxAspect);
              return (
                <div className={`viewer-peek ${side}`} key={side} aria-hidden="true">
                  <div className="viewer-peek-frame" style={{ left: `${frame.left}%`, top: `${frame.top}%`, width: `${frame.width}%`, height: `${frame.height}%` }}>
                    {thumb && <img src={thumb.url} alt="" />}
                  </div>
                  <span style={{ top: `calc(${frame.top + frame.height}% + 14px)` }}>{neighbour.title}</span>
                </div>
              );
            })}
            <div
              className="viewer-video-rect"
              style={videoRect ? { left: `${videoRect.left}%`, top: `${videoRect.top}%`, width: `${videoRect.width}%`, height: `${videoRect.height}%` } : undefined}
            >
              {isMobileHero && vimeoThumbs[current.vimeoId] && (
                <img className="viewer-poster" src={vimeoThumbs[current.vimeoId].url} alt="" aria-hidden="true" />
              )}
              <iframe
                ref={viewerFrame}
                key={current.id}
                src={`https://player.vimeo.com/video/${current.vimeoId}?${current.vimeoHash ? `h=${current.vimeoHash}&` : ""}autoplay=0&controls=0&title=0&byline=0&portrait=0&dnt=1`}
                title={current.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onLoad={requestViewerDimensions}
              />
              {videoRect && (
                <>
                  <div className="viewer-progress" onClick={(event) => event.stopPropagation()} onPointerDown={startSeek}>
                    <div className="viewer-progress-track">
                      <div
                        className="viewer-progress-fill"
                        style={{ width: `${viewerProgress.duration ? (viewerProgress.seconds / viewerProgress.duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    className="viewer-fullscreen"
                    type="button"
                    onClick={toggleFullscreen}
                    onMouseEnter={() => setCursorSuppressed(true)}
                    onMouseLeave={() => setCursorSuppressed(false)}
                    aria-label={viewerFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 7V3h4" /><path d="M21 7V3h-4" /><path d="M3 17v4h4" /><path d="M21 17v4h-4" />
                      <path d="M15 9l2.3-2.3" /><path d="M17.3 8v-1.3h-1.3" />
                      <path d="M9 15l-2.3 2.3" /><path d="M6.7 16v1.3h1.3" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="viewer-top"><span>{current.title}</span><button className="viewer-mobile-close" onClick={(event) => { event.stopPropagation(); close(); }} aria-label="Close video">CLOSE ×</button></div>
          <button
            className="viewer-arrow previous"
            onClick={(event) => { event.stopPropagation(); move(-1); }}
            onMouseEnter={() => setCursorSuppressed(true)}
            onMouseLeave={() => setCursorSuppressed(false)}
            aria-label="Previous project"
          >←</button>
          <button
            className="viewer-arrow next"
            onClick={(event) => { event.stopPropagation(); move(1); }}
            onMouseEnter={() => setCursorSuppressed(true)}
            onMouseLeave={() => setCursorSuppressed(false)}
            aria-label="Next project"
          >→</button>
          {current.credits?.length ? (
            <div className={`viewer-credit ${viewerAtEdge ? "" : "faded"}`}>{current.credits.map((credit) => `${credit.label} by ${credit.value}`).join(" · ")}</div>
          ) : null}
          <div className={`viewer-count ${viewerAtEdge ? "" : "faded"}`}>{String(viewerIndex! + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</div>
          <div className="viewer-mobile-bar" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => goTo(-1)} aria-label="Previous project">← PREV</button>
            <span>{String(viewerIndex! + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => goTo(1)} aria-label="Next project">NEXT →</button>
          </div>
          <span
            className={`viewer-cursor ${cursor.visible && !cursorSuppressed ? "visible" : ""}`}
            style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0) translateY(-50%)` }}
            aria-hidden="true"
          >
            {viewerAtEdge ? "CLOSE" : viewerPlaying ? "PAUSE" : "PLAY"}
          </span>
        </div>
      )}
    </main>
  );
}

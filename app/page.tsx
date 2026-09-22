"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fallbackContent, loadCmsContent, type Project } from "./data";

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
  const duration = useRef(60);
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
    if (dimensions.current.width && dimensions.current.height) {
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
        if (data?.method === "getDuration" && Number.isFinite(data.value)) duration.current = data.value;
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

  const scrub = (event: React.MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    send("setCurrentTime", ((event.clientX - bounds.left) / bounds.width) * duration.current);
    setTileCursor({ x: event.clientX, y: event.clientY });
  };

  return (
    <article
      className="project-tile"
      style={{ "--accent": project.accent } as React.CSSProperties}
      onMouseEnter={() => {
        setActive(true);
        send("play");
      }}
      onMouseLeave={() => { setActive(false); send("pause"); }}
      onMouseMove={scrub}
    >
      <button className="tile-hit" onClick={onOpen} aria-label={`Play ${project.title}`}>
        <iframe
          ref={frame}
          src={`https://player.vimeo.com/video/${project.vimeoId}?${project.vimeoHash ? `h=${project.vimeoHash}&` : ""}autoplay=0&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1`}
          title={`${project.title} preview`}
          allow="autoplay; fullscreen; picture-in-picture"
          style={coverStyle}
          onLoad={() => {
            send("getDuration");
            requestDimensions();
            stopDimensionPoll();
            dimensionPoll.current = setInterval(requestDimensions, 250);
            setTimeout(stopDimensionPoll, 4000);
          }}
        />
        {project.thumbnailUrl && (
          <img src={project.thumbnailUrl} alt="" className={`tile-thumbnail ${active ? "hidden" : ""}`} />
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

export default function Home() {
  const [content, setContent] = useState(fallbackContent);
  const [category, setCategory] = useState(fallbackContent.sections[0].id);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [viewerPlaying, setViewerPlaying] = useState(false);
  const [viewerAtEdge, setViewerAtEdge] = useState(false);
  const [viewerDimensions, setViewerDimensions] = useState({ width: 16, height: 9 });
  const [mobileVideoBottom, setMobileVideoBottom] = useState<number | null>(null);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  // The instant-loading placeholder caused enough autoplay-policy trouble on
  // phones (stuck play buttons, hung state) that it's not worth it there —
  // mobile just shows the Vimeo reel directly, taking its natural load time,
  // same as before this feature existed. Desktop keeps the placeholder.
  const [isTouchDevice] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const heroFrame = useRef<HTMLIFrameElement>(null);
  const heroPlaceholder = useRef<HTMLVideoElement>(null);
  const viewerFrame = useRef<HTMLIFrameElement>(null);
  const viewerMedia = useRef<HTMLDivElement>(null);
  const activeSection = content.sections.find((section) => section.id === category) || content.sections[0];
  const visible = activeSection?.projects || [];

  useEffect(() => {
    const controller = new AbortController();
    loadCmsContent(controller.signal)
      .then((nextContent) => {
        setContent(nextContent);
        setCategory((current) => nextContent.sections.some((section) => section.id === current) ? current : nextContent.sections[0].id);
      })
      .catch(() => { /* Keep the built-in content if Sanity is unavailable. */ });
    return () => controller.abort();
  }, []);

  const close = useCallback(() => {
    setViewerIndex(null);
    setViewerPlaying(false);
  }, []);
  const move = useCallback((direction: number) => {
    setViewerPlaying(false);
    setViewerAtEdge(false);
    setViewerIndex((current) => current === null ? null : (current + direction + visible.length) % visible.length);
  }, [visible.length]);

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

    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== viewerFrame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "ready") requestViewerDimensions();
        if (data?.method === "getVideoWidth" && Number.isFinite(data.value)) {
          setViewerDimensions((dimensions) => ({ ...dimensions, width: data.value }));
        }
        if (data?.method === "getVideoHeight" && Number.isFinite(data.value)) {
          setViewerDimensions((dimensions) => ({ ...dimensions, height: data.value }));
        }
      } catch { /* Ignore unrelated player messages. */ }
    };

    const retry = window.setTimeout(requestViewerDimensions, 500);
    window.addEventListener("message", receive);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("message", receive);
    };
  }, [viewerIndex, requestViewerDimensions]);

  // On mobile, a horizontal video's bottom edge (past its letterboxed
  // margin) is where the credit/counter text should sit, instead of the
  // desktop's fixed distance from the screen's own bottom edge.
  useEffect(() => {
    if (viewerIndex === null) return;
    const updateVideoBottom = () => {
      const bounds = viewerMedia.current?.getBoundingClientRect();
      const videoAspect = viewerDimensions.width / viewerDimensions.height;
      if (!bounds || !Number.isFinite(videoAspect) || videoAspect <= 0) return;
      const containerAspect = bounds.width / bounds.height;
      if (videoAspect > containerAspect) {
        const videoHeight = bounds.width / videoAspect;
        setMobileVideoBottom(bounds.top + (bounds.height + videoHeight) / 2);
      } else {
        setMobileVideoBottom(bounds.bottom);
      }
    };
    updateVideoBottom();
    window.addEventListener("resize", updateVideoBottom);
    window.addEventListener("orientationchange", updateVideoBottom);
    return () => {
      window.removeEventListener("resize", updateVideoBottom);
      window.removeEventListener("orientationchange", updateVideoBottom);
    };
  }, [viewerIndex, viewerDimensions]);

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

  const trackViewerCursor = (event: React.MouseEvent<HTMLDivElement>) => {
    const edgeX = window.innerWidth * 0.16;
    const edgeY = window.innerHeight * 0.13;
    let atEdge = event.clientX < edgeX || event.clientX > window.innerWidth - edgeX || event.clientY < edgeY || event.clientY > window.innerHeight - edgeY;
    const bounds = viewerMedia.current?.getBoundingClientRect();
    const videoAspect = viewerDimensions.width / viewerDimensions.height;

    if (bounds && Number.isFinite(videoAspect) && videoAspect > 0) {
      const containerAspect = bounds.width / bounds.height;
      const innerTrigger = Math.min(48, window.innerWidth * 0.03);

      if (videoAspect < containerAspect) {
        const videoWidth = bounds.height * videoAspect;
        const videoLeft = bounds.left + (bounds.width - videoWidth) / 2;
        const videoRight = videoLeft + videoWidth;
        atEdge ||= event.clientX < videoLeft + innerTrigger || event.clientX > videoRight - innerTrigger;
      } else if (videoAspect > containerAspect) {
        const videoHeight = bounds.width / videoAspect;
        const videoTop = bounds.top + (bounds.height - videoHeight) / 2;
        const videoBottom = videoTop + videoHeight;
        atEdge ||= event.clientY < videoTop + innerTrigger || event.clientY > videoBottom - innerTrigger;
      }
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
  }, []);

  // The local placeholder plays instantly (no iframe/network handshake);
  // once Vimeo confirms actual playback has started, cut away to it.
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

  const toggleHeroSound = () => {
    const nextMuted = !heroMuted;
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

  return (
    <main>
      <header className="topbar">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{content.siteTitle}</button>
        <nav aria-label="Main navigation">
          {content.sections.map((section) => <button key={section.id} onClick={() => choose(section.id)}>{section.title}</button>)}
          <button onClick={() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" })}>ABOUT</button>
        </nav>
      </header>

      <section className="hero" aria-label="Featured reel">
        {!heroReady && !isTouchDevice && (
          <video
            ref={heroPlaceholder}
            className="hero-video hero-placeholder"
            src="/hero-placeholder.mp4"
            muted
            loop
            playsInline
            aria-hidden="true"
            onClick={(event) => { event.currentTarget.play().catch(() => {}); }}
          />
        )}
        <iframe
          ref={heroFrame}
          className="hero-video"
          src={`https://player.vimeo.com/video/${content.homepageReel.vimeoId}?${content.homepageReel.vimeoHash ? `h=${content.homepageReel.vimeoHash}&` : ""}background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1`}
          title="Maximilian Kelly editors reel"
          allow="autoplay; fullscreen; picture-in-picture"
          onLoad={subscribeHeroEvents}
        />
        <button className="hero-sound" type="button" onClick={toggleHeroSound}>
          {heroMuted ? "SOUND ON" : "SOUND OFF"}
        </button>
      </section>

      <section id="work" className={`work ${showWork ? "revealed" : ""}`}>
        <div className="grid">
          {visible.map((project, index) => <VideoTile key={project.id} project={project} onOpen={() => setViewerIndex(index)} />)}
        </div>
      </section>

      <section id="about" className="about">
        <p className="eyebrow">ABOUT</p>
        <p className="about-inspiration">{content.aboutLead}</p>
        <p className="about-bio">{content.aboutBio}</p>
      </section>

      {current && (
        <div
          className={`viewer ${viewerAtEdge ? "at-edge" : ""} ${viewerPlaying ? "is-playing" : ""}`}
          data-orientation={viewerDimensions.width >= viewerDimensions.height ? "horizontal" : "vertical"}
          style={{ "--mobile-credit-top": mobileVideoBottom !== null ? `${mobileVideoBottom}px` : undefined } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-label={`${current.title} video player`}
          onMouseMove={trackViewerCursor}
          onMouseLeave={() => setCursor((position) => ({ ...position, visible: false }))}
          onClick={() => viewerAtEdge ? close() : toggleViewer()}
        >
          <div className="viewer-media" ref={viewerMedia}>
            <iframe
              ref={viewerFrame}
              key={current.id}
              src={`https://player.vimeo.com/video/${current.vimeoId}?${current.vimeoHash ? `h=${current.vimeoHash}&` : ""}autoplay=0&controls=0&title=0&byline=0&portrait=0&dnt=1`}
              title={current.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={requestViewerDimensions}
            />
          </div>
          <div className="viewer-top"><span>{current.title}</span><button className="viewer-mobile-close" onClick={(event) => { event.stopPropagation(); close(); }} aria-label="Close video">CLOSE ×</button></div>
          <button className="viewer-arrow previous" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Previous project">←</button>
          <button className="viewer-arrow next" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Next project">→</button>
          {current.credits?.length ? (
            <div className={`viewer-credit ${viewerAtEdge ? "" : "faded"}`}>{current.credits.map((credit) => `${credit.label} by ${credit.value}`).join(" · ")}</div>
          ) : null}
          <div className={`viewer-count ${viewerAtEdge ? "" : "faded"}`}>{String(viewerIndex! + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</div>
          <span
            className={`viewer-cursor ${cursor.visible ? "visible" : ""}`}
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

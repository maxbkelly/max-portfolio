"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { projects, type Category, type Project } from "./data";

const categories: Category[] = ["DIRECTOR", "EDITOR", "A.I."];

function VideoTile({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const duration = useRef(60);
  const [active, setActive] = useState(false);
  const [tileCursor, setTileCursor] = useState({ x: 0, y: 0 });

  const send = (method: string, value?: number) => {
    frame.current?.contentWindow?.postMessage(
      value === undefined ? { method } : { method, value },
      "https://player.vimeo.com",
    );
  };

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== frame.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.method === "getDuration" && Number.isFinite(data.value)) duration.current = data.value;
      } catch { /* Ignore unrelated player messages. */ }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

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
          onLoad={() => send("getDuration")}
        />
        <span className="tile-shade" />
        <span className="tile-index">{project.category}</span>
      </button>
      <span
        className={`tile-cursor ${active ? "visible" : ""}`}
        style={{ transform: `translate3d(${tileCursor.x}px, ${tileCursor.y}px, 0) translateY(-50%)` }}
        aria-hidden="true"
      >
        PLAY
      </span>
      <div className="tile-meta">
        <h3>{project.title}</h3>
        <p>{project.client} <span>{project.year}</span></p>
      </div>
    </article>
  );
}

export default function Home() {
  const [category, setCategory] = useState<Category>("DIRECTOR");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [viewerPlaying, setViewerPlaying] = useState(false);
  const [viewerAtEdge, setViewerAtEdge] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const viewerFrame = useRef<HTMLIFrameElement>(null);
  const visible = projects.filter((project) => project.category === category);

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
    const edgeX = window.innerWidth * 0.09;
    const edgeY = window.innerHeight * 0.09;
    const atEdge = event.clientX < edgeX || event.clientX > window.innerWidth - edgeX || event.clientY < edgeY || event.clientY > window.innerHeight - edgeY;
    setViewerAtEdge(atEdge);
    setCursor({ x: event.clientX, y: event.clientY, visible: true });
  };

  const choose = (next: Category) => {
    setCategory(next);
    setShowWork(true);
    requestAnimationFrame(() => document.querySelector("#work")?.scrollIntoView({ behavior: "smooth" }));
  };

  const current = viewerIndex === null ? null : visible[viewerIndex];

  return (
    <main>
      <header className="topbar">
        <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>MAXIMILIAN KELLY</button>
        <nav aria-label="Main navigation">
          {categories.map((item) => <button key={item} onClick={() => choose(item)}>{item}</button>)}
          <button onClick={() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" })}>ABOUT</button>
        </nav>
      </header>

      <section className="hero" aria-label="Featured reel">
        <iframe
          className="hero-video"
          src="https://player.vimeo.com/video/1081978908?background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1"
          title="Maximilian Kelly editors reel"
          allow="autoplay; fullscreen; picture-in-picture"
        />
        <div className="film-grain" />
      </section>

      <section id="work" className={`work ${showWork ? "revealed" : ""}`}>
        <div className="section-head">
          <p>SELECTED WORK</p>
          <div className="category-tabs">
            {categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <span>{String(visible.length).padStart(2, "0")} FILMS</span>
        </div>
        <div className="grid">
          {visible.map((project, index) => <VideoTile key={project.id} project={project} onOpen={() => setViewerIndex(index)} />)}
        </div>
      </section>

      <section id="about" className="about">
        <p className="eyebrow">ABOUT</p>
        <p className="about-inspiration">My inspirations include ’90s skate videos, Lil Wayne’s “6 Foot 7 Foot” music video, and the films of Charlie Kaufman.</p>
        <p className="about-bio">Originally from San Francisco, I lived in Amsterdam and then Minneapolis before moving to Chicago to obtain my degree in Post Production Cinema from Columbia College. Now living in LA, I’m focused on creating rhythm, pacing and mood through my projects.</p>
      </section>

      {current && (
        <div
          className={`viewer ${viewerAtEdge ? "at-edge" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${current.title} video player`}
          onMouseMove={trackViewerCursor}
          onMouseLeave={() => setCursor((position) => ({ ...position, visible: false }))}
          onClick={() => viewerAtEdge ? close() : toggleViewer()}
        >
          <div className="viewer-media">
            <iframe
              ref={viewerFrame}
              key={current.id}
              src={`https://player.vimeo.com/video/${current.vimeoId}?${current.vimeoHash ? `h=${current.vimeoHash}&` : ""}autoplay=0&controls=0&title=0&byline=0&portrait=0&dnt=1`}
              title={current.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="viewer-top"><span>{current.title}</span><button className="viewer-mobile-close" onClick={(event) => { event.stopPropagation(); close(); }} aria-label="Close video">CLOSE ×</button></div>
          <button className="viewer-arrow previous" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Previous project">←</button>
          <button className="viewer-arrow next" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Next project">→</button>
          <div className="viewer-count">{String(viewerIndex! + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</div>
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

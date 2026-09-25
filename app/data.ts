export type Credit = {
  label: string;
  value: string;
};

export type Project = {
  id: string;
  sourceId: string;
  title: string;
  client?: string;
  projectName?: string;
  vimeoId: string;
  vimeoHash?: string;
  accent: string;
  credits?: Credit[];
  thumbnailUrl?: string;
  hoverPreviewUrl?: string;
};

export type PortfolioSection = {
  id: string;
  title: string;
  slug: string;
  projects: Project[];
};

export type PortfolioContent = {
  siteTitle: string;
  homepageReel: {vimeoId: string; vimeoHash?: string};
  homepageReelMobile?: {vimeoId: string; vimeoHash?: string};
  homepageReelMobileVideoUrl?: string;
  sections: PortfolioSection[];
  aboutParagraphs: string[];
  aboutHeadshotUrl?: string;
};

type ProjectSource = {
  sourceId: string;
  title: string;
  vimeoUrl: string;
  accent: string;
};

const standardProjects: ProjectSource[] = [
  {sourceId: "project-nissan-rogue", title: "NISSAN ROGUE", vimeoUrl: "https://vimeo.com/1210876614/25cd361387", accent: "#b9c6d8"},
  {sourceId: "project-shroombabe", title: "SHROOMBABE", vimeoUrl: "https://vimeo.com/1210377001", accent: "#718c98"},
  {sourceId: "project-twitter", title: "TWITTER", vimeoUrl: "https://vimeo.com/1057702271", accent: "#d26f49"},
  {sourceId: "project-stanford-health", title: "STANFORD HEALTH", vimeoUrl: "https://vimeo.com/1169044368", accent: "#c8b99a"},
  {sourceId: "project-antman", title: "ANTMAN", vimeoUrl: "https://vimeo.com/1169045590", accent: "#8878a5"},
  {sourceId: "project-xfinity", title: "XFINITY", vimeoUrl: "https://vimeo.com/1100147524", accent: "#b37d75"},
  {sourceId: "project-veeps", title: "VEEPS", vimeoUrl: "https://vimeo.com/1121336042/f3a1b74393", accent: "#6b8180"},
  {sourceId: "project-sophie-cates", title: "SOPHIE CATES", vimeoUrl: "https://vimeo.com/1009989251", accent: "#a59678"},
];

const aiProjects: ProjectSource[] = [
  {sourceId: "project-inter", title: "INTER", vimeoUrl: "https://vimeo.com/1166167096", accent: "#b9c6d8"},
  {sourceId: "project-gnome-party", title: "GNOME PARTY", vimeoUrl: "https://vimeo.com/1093253957", accent: "#718c98"},
  {sourceId: "project-cowbubble", title: "COWBUBBLE", vimeoUrl: "https://vimeo.com/1055701904/fc8f9e419a", accent: "#d26f49"},
  {sourceId: "project-hippo", title: "HIPPO", vimeoUrl: "https://vimeo.com/1055702534/4296aa6cb2", accent: "#c8b99a"},
];

export function parseVimeoUrl(url: string) {
  const parsed = url.match(/(?:video\/|videos\/|vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (!parsed) return null;
  const queryHash = url.match(/[?&]h=([a-zA-Z0-9]+)/)?.[1];
  return {vimeoId: parsed[1], ...(parsed[2] || queryHash ? {vimeoHash: parsed[2] || queryHash} : {})};
}

function makeSection(id: string, title: string, slug: string, sources: ProjectSource[]): PortfolioSection {
  return {
    id,
    title,
    slug,
    projects: Array.from({length: 12}, (_, index) => {
      const source = sources[index % sources.length];
      const video = parseVimeoUrl(source.vimeoUrl)!;
      return {...source, ...video, id: `${id}-${index + 1}`};
    }),
  };
}

export const fallbackContent: PortfolioContent = {
  siteTitle: "MAXIMILIAN KELLY",
  homepageReel: {vimeoId: "1081978908"},
  sections: [
    makeSection("section-director", "DIRECTOR", "director", standardProjects),
    makeSection("section-editor", "EDITOR", "editor", standardProjects),
    makeSection("section-ai", "A.I.", "ai", aiProjects),
  ],
  aboutParagraphs: [
    "Originally from San Francisco, I lived in Amsterdam and then Minneapolis before moving to Chicago to obtain my degree in Post Production Cinema from Columbia College. Now living in LA, I’m focused on creating rhythm, pacing and mood through my projects.",
    "My inspirations include ’90s skate videos, Lil Wayne’s “6 Foot 7 Foot” music video, and the films of Charlie Kaufman.",
  ],
};

const query = `*[_type == "siteSettings" && _id == "siteSettings"][0]{
  siteTitle,
  homepageReelUrl,
  homepageReelMobileUrl,
  "homepageReelMobileVideoUrl": homepageReelMobileVideo.asset->url,
  aboutParagraph1,
  aboutParagraph2,
  aboutParagraph3,
  "aboutHeadshotUrl": aboutHeadshot.asset->url + "?w=800&q=80&auto=format",
  "sections": sections[]{
    "placementId": _key,
    ...@->{
      _id,
      title,
      "slug": slug.current,
      enabled,
      "projects": projects[]{
        "placementId": _key,
        ...@->{_id, title, client, projectName, vimeoUrl, accent, credits, "thumbnailUrl": thumbnail.asset->url + "?w=1000&q=75&auto=format", "hoverPreviewUrl": hoverPreview.asset->url}
      }
    }
  }
}`;

type SanityResponse = {
  result?: {
    siteTitle?: string;
    homepageReelUrl?: string;
    homepageReelMobileUrl?: string;
    homepageReelMobileVideoUrl?: string;
    aboutParagraph1?: string;
    aboutParagraph2?: string;
    aboutParagraph3?: string;
    aboutHeadshotUrl?: string;
    sections?: Array<{
      placementId?: string;
      _id?: string;
      title?: string;
      slug?: string;
      enabled?: boolean;
      projects?: Array<{
        placementId?: string;
        _id?: string;
        title?: string;
        client?: string;
        projectName?: string;
        vimeoUrl?: string;
        accent?: string;
        credits?: Credit[];
        thumbnailUrl?: string;
        hoverPreviewUrl?: string;
      }>;
    }>;
  };
};

export async function loadCmsContent(signal?: AbortSignal): Promise<PortfolioContent> {
  const endpoint = `https://j7kkjji4.apicdn.sanity.io/v2026-08-01/data/query/production?query=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {signal});
  if (!response.ok) throw new Error(`Sanity request failed: ${response.status}`);
  const {result} = await response.json() as SanityResponse;
  if (!result) throw new Error("Site settings are missing");

  const sections = (result.sections || [])
    .filter((section) => section.enabled !== false && section._id && section.title)
    .map((section): PortfolioSection => ({
      id: section._id!,
      title: section.title!,
      slug: section.slug || section._id!,
      projects: (section.projects || []).flatMap((project, index) => {
        if (!project._id || !project.title || !project.vimeoUrl) return [];
        const video = parseVimeoUrl(project.vimeoUrl);
        if (!video) return [];
        return [{
          id: project.placementId || `${section._id}-${project._id}-${index}`,
          sourceId: project._id,
          title: project.title,
          accent: project.accent || "#827c71",
          ...(project.client && project.projectName ? {client: project.client, projectName: project.projectName} : {}),
          ...(project.credits?.length ? {credits: project.credits} : {}),
          ...(project.thumbnailUrl ? {thumbnailUrl: project.thumbnailUrl} : {}),
          ...(project.hoverPreviewUrl ? {hoverPreviewUrl: project.hoverPreviewUrl} : {}),
          ...video,
        }];
      }),
    }))
    .filter((section) => section.projects.length > 0);

  const homepageReel = parseVimeoUrl(result.homepageReelUrl || "") || fallbackContent.homepageReel;
  const homepageReelMobile = parseVimeoUrl(result.homepageReelMobileUrl || "") || undefined;
  const aboutParagraphs = [result.aboutParagraph1, result.aboutParagraph2, result.aboutParagraph3].filter(
    (paragraph): paragraph is string => Boolean(paragraph),
  );
  return {
    siteTitle: result.siteTitle || fallbackContent.siteTitle,
    homepageReel,
    ...(homepageReelMobile ? {homepageReelMobile} : {}),
    ...(result.homepageReelMobileVideoUrl ? {homepageReelMobileVideoUrl: result.homepageReelMobileVideoUrl} : {}),
    sections: sections.length ? sections : fallbackContent.sections,
    aboutParagraphs: aboutParagraphs.length ? aboutParagraphs : fallbackContent.aboutParagraphs,
    ...(result.aboutHeadshotUrl ? {aboutHeadshotUrl: result.aboutHeadshotUrl} : {}),
  };
}

export type Category = "DIRECTOR" | "EDITOR" | "A.I.";

export type Project = {
  id: string;
  title: string;
  category: Category;
  vimeoId: string;
  vimeoHash?: string;
  accent: string;
};

// This content layer can later be supplied by the browser-based CMS.
const standardProjects = [
  { title: "NISSAN ROGUE", vimeoId: "1210876614", vimeoHash: "25cd361387" },
  { title: "SHROOMBABE", vimeoId: "1210377001" },
  { title: "TWITTER", vimeoId: "1057702271" },
  { title: "STANFORD HEALTH", vimeoId: "1169044368" },
  { title: "ANTMAN", vimeoId: "1169045590" },
  { title: "XFINITY", vimeoId: "1100147524" },
  { title: "VEEPS", vimeoId: "1121336042", vimeoHash: "f3a1b74393" },
  { title: "SOPHIE CATES", vimeoId: "1009989251" },
] as const;

const aiProjects = [
  { title: "INTER", vimeoId: "1166167096" },
  { title: "GNOME PARTY", vimeoId: "1093253957" },
  { title: "COWBUBBLE", vimeoId: "1055701904", vimeoHash: "fc8f9e419a" },
  { title: "HIPPO", vimeoId: "1055702534", vimeoHash: "4296aa6cb2" },
] as const;

const categories: Category[] = ["DIRECTOR", "EDITOR", "A.I."];
const projectsByCategory = {
  DIRECTOR: standardProjects,
  EDITOR: standardProjects,
  "A.I.": aiProjects,
} as const;
const accents = ["#b9c6d8", "#718c98", "#d26f49", "#c8b99a", "#8878a5", "#b37d75", "#6b8180", "#a59678", "#827c71"];

export const projects: Project[] = categories.flatMap((category) =>
  Array.from({ length: 9 }, (_, index) => {
    const categoryProjects = projectsByCategory[category];
    const source = categoryProjects[index % categoryProjects.length];
    return {
      id: `${category.toLowerCase().replaceAll(".", "")}-${index + 1}`,
      title: source.title,
      category,
      vimeoId: source.vimeoId,
      ...(source.vimeoHash ? { vimeoHash: source.vimeoHash } : {}),
      accent: accents[index],
    };
  }),
);

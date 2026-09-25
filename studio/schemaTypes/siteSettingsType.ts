import {defineField, defineType} from "sanity";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "siteTitle",
      title: "Name in the upper-left corner",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "homepageReelUrl",
      title: "Homepage Vimeo reel",
      type: "url",
      validation: (Rule) => Rule.required().uri({scheme: ["http", "https"]}),
    }),
    defineField({
      name: "homepageReelMobileUrl",
      title: "Mobile homepage reel",
      description: "Optional. A 9:16 (vertical) version shown on phones instead of the reel above. Leave blank to use the same reel on mobile.",
      type: "url",
      validation: (Rule) => Rule.uri({scheme: ["http", "https"]}),
    }),
    defineField({
      name: "homepageReelMobileVideo",
      title: "Mobile homepage reel — fast video file",
      description: "Optional. A 9:16 MP4 (about 720×1280, under ~10 MB) that phones play directly instead of loading Vimeo, so the reel starts much faster on mobile data. Leave blank to use the Vimeo mobile reel above. Does not affect desktop.",
      type: "file",
      options: {accept: "video/mp4"},
    }),
    defineField({
      name: "sections",
      title: "Navigation sections",
      description: "Drag to change the menu order. Add or remove sections here to change the website navigation.",
      type: "array",
      of: [{type: "reference", to: [{type: "section"}]}],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: "aboutHeadshot",
      title: "About headshot",
      description: "Optional. A square (1:1) photo shown next to the About text.",
      type: "image",
      options: {hotspot: true},
    }),
    defineField({
      name: "aboutParagraph1",
      title: "About paragraph 1",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "aboutParagraph2",
      title: "About paragraph 2",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "aboutParagraph3",
      title: "About paragraph 3",
      type: "text",
      rows: 4,
    }),
  ],
  preview: {prepare: () => ({title: "Site settings"})},
});

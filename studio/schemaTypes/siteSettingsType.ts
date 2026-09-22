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
      name: "sections",
      title: "Navigation sections",
      description: "Drag to change the menu order. Add or remove sections here to change the website navigation.",
      type: "array",
      of: [{type: "reference", to: [{type: "section"}]}],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: "aboutLead",
      title: "Large About text",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "aboutBio",
      title: "Smaller About text",
      type: "text",
      rows: 7,
    }),
  ],
  preview: {prepare: () => ({title: "Site settings"})},
});

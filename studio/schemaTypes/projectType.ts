import {defineField, defineType} from "sanity";

export const projectType = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Fallback title",
      description: "Used everywhere (browser tab, video alt text) until Client and Project name below are both filled in — then those replace it under the thumbnail.",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "client",
      title: "Client",
      description: "Shown on the left under the thumbnail. Leave this and Project name blank to keep showing the Fallback title instead.",
      type: "string",
    }),
    defineField({
      name: "projectName",
      title: "Project name",
      description: "Shown on the right under the thumbnail.",
      type: "string",
    }),
    defineField({
      name: "vimeoUrl",
      title: "Vimeo link",
      description: "Paste the regular or unlisted Vimeo link. Manager links work too.",
      type: "url",
      validation: (Rule) => Rule.required().uri({scheme: ["http", "https"]}),
    }),
    defineField({
      name: "thumbnail",
      title: "Custom thumbnail",
      description: "Optional. Shown in the grid instead of the video's own frame. Leave blank to keep showing the video frame.",
      type: "image",
      options: {hotspot: true},
    }),
    defineField({
      name: "hoverPreview",
      title: "Hover preview clip",
      description: "Optional. A short (under 5 seconds), low-resolution, silent video — a few key moments cut together — that plays in place of the thumbnail while someone hovers over this project in the grid. Leave blank to just show the thumbnail with a subtle zoom on hover.",
      type: "file",
      options: {accept: "video/mp4"},
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "credits",
      title: "Credits",
      description: "Optional credit lines shown with the project later.",
      type: "array",
      of: [
        {
          type: "object",
          name: "credit",
          fields: [
            {name: "label", title: "Role", type: "string"},
            {name: "value", title: "Name", type: "string"},
          ],
          preview: {select: {title: "label", subtitle: "value"}},
        },
      ],
    }),
    defineField({
      name: "accent",
      title: "Loading color",
      description: "Optional hex color shown before the Vimeo preview loads.",
      type: "string",
      initialValue: "#827c71",
      validation: (Rule) => Rule.regex(/^#[0-9a-fA-F]{6}$/, {name: "hex color"}).warning("Use a six-digit hex color such as #827c71"),
    }),
  ],
  preview: {
    select: {title: "title", subtitle: "vimeoUrl", media: "thumbnail"},
  },
});

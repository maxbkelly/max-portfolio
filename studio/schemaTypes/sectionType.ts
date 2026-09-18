import {defineField, defineType} from "sanity";

export const sectionType = defineType({
  name: "section",
  title: "Section",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Menu name",
      description: "Examples: DIRECTOR, EDITOR, CINEMATOGRAPHER, SOCIAL",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      options: {source: "title", maxLength: 60},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "enabled",
      title: "Show this section on the website",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "projects",
      title: "Projects in this section",
      description: "Drag to reorder. A project can appear in more than one section.",
      type: "array",
      of: [{type: "reference", to: [{type: "project"}]}],
    }),
  ],
  preview: {
    select: {title: "title", enabled: "enabled", projects: "projects"},
    prepare({title, enabled, projects}) {
      const count = Array.isArray(projects) ? projects.length : 0;
      return {title, subtitle: `${enabled === false ? "Hidden · " : ""}${count} project${count === 1 ? "" : "s"}`};
    },
  },
});

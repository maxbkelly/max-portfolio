import type {StructureResolver} from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Max Website")
    .items([
      S.listItem()
        .title("Site settings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("section").title("Sections & navigation"),
      S.documentTypeListItem("project").title("Projects & videos"),
    ]);

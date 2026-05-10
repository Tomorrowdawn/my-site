import { config, fields, collection } from "@keystatic/core";

export default config({
  storage: {
    kind: "github",
    repo: "Tomorrowdawn/my-site",
  },

  collections: {
    posts: collection({
      label: "Posts",
      slugField: "title",
      path: "src/content/posts/*/",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        tags: fields.multiselect({
          label: "Tags",
          options: [
            { label: "Math", value: "math" },
            { label: "Philosophy", value: "philosophy" },
            { label: "Code", value: "code" },
            { label: "Other", value: "other" },
          ],
          defaultValue: ["other"],
        }),
        createdAt: fields.text({
          label: "Created At",
          description: "Format: YYYY-MM-DD",
        }),
        origin: fields.text({
          label: "Origin URL",
          description: "Original source URL (optional)",
        }),
        excerpt: fields.text({
          label: "Excerpt",
          description: "Short description for preview",
          multiline: true,
        }),
        content: fields.markdoc({
          label: "Content",
        }),
      },
    }),
  },
});

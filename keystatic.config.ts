import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: 'Tomorrowdawn/my-site',
  },

  collections: {
    posts: collection({
      label: '博客文章',
      slugField: 'title',
      path: 'src/content/posts/*/index',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: '标题' } }),
        tags: fields.multiselect({
          label: '标签',
          options: [
            { label: 'Math', value: 'math' },
            { label: 'Philosophy', value: 'philosophy' },
            { label: 'Code', value: 'code' },
            { label: 'Other', value: 'other' },
          ],
        }),
        createdAt: fields.date({
          label: '创建日期',
          defaultValue: { kind: 'today' },
        }),
        origin: fields.url({
          label: '来源链接',
        }),
        excerpt: fields.text({
          label: '摘要',
          multiline: true,
        }),
        content: fields.markdoc({
          label: '正文',
          options: {
            image: {
              directory: 'src/content/posts',
              publicPath: '/src/content/posts/',
            },
          },
        }),
      },
    }),
  },
});

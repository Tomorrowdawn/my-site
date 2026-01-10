import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

const POSTS_PER_PAGE = 10;

const categories = ["all", "math", "philosophy", "code"];

export async function getStaticPaths() {
  return categories.map((category) => ({
    params: { category },
  }));
}

// 替换图片为 [图片] 的 remark 插件
function remarkReplaceImages() {
  return function (tree: any) {
    visit(tree, "image", (node: any, index?: number, parent?: any) => {
      // 将图片节点替换为文本节点 [图片]
      if (index !== undefined && parent) {
        parent.children[index] = {
          type: "text",
          value: "[图片]",
        };
      }
    });
  };
}

function extractExcerpt(body: string, targetLength: number = 200): string {
  let currentLength = 0;
  let position = 0;
  
  while (position < body.length && currentLength < targetLength) {
    const remainingText = body.slice(position);
    
    const inlineMathMatch = remainingText.match(/^\$(?!\$)[^\$]+\$/);
    if (inlineMathMatch) {
      position += inlineMathMatch[0].length;
      currentLength += inlineMathMatch[0].length;
      continue;
    }
    
    const blockMathMatch = remainingText.match(/^\$\$[^\$]+\$\$/s);
    if (blockMathMatch) {
      position += blockMathMatch[0].length;
      currentLength += blockMathMatch[0].length;
      continue;
    }
    
    currentLength++;
    position++;
  }
  
  if (position < body.length) {
    const remainingText = body.slice(position);
    
    const inlineMathMatch = remainingText.match(/^\$(?!\$)[^\$]+\$/);
    if (inlineMathMatch) {
      position += inlineMathMatch[0].length;
    }
    
    const blockMathMatch = remainingText.match(/^\$\$[^\$]+\$\$/s);
    if (blockMathMatch) {
      position += blockMathMatch[0].length;
    }
  }

  return body.slice(0, position).trim();
}

async function renderExcerpt(excerpt: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkReplaceImages) // 替换图片为 [图片]
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify);

  const result = await processor.process(excerpt);
  return String(result);
}

export const GET: APIRoute = async ({ params }) => {
  const { category } = params;

  const allPosts = await getCollection("posts");

  const filteredPosts =
    category === "all"
      ? allPosts
      : allPosts.filter((post) =>
          post.data.tags.includes(category as "math" | "philosophy" | "code")
        );

  const sortedPosts = filteredPosts.sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() -
      new Date(a.data.createdAt).getTime()
  );

  const postsData = await Promise.all(
    sortedPosts.map(async (post) => {
      const excerpt = extractExcerpt(post.body);
      return {
        title: post.data.title,
        slug: post.slug,
        date: post.data.createdAt,
        excerptHtml: excerpt ? await renderExcerpt(excerpt) : "",
        tags: post.data.tags,
      };
    })
  );

  const totalPages = Math.ceil(postsData.length / POSTS_PER_PAGE);

  return new Response(
    JSON.stringify({
      posts: postsData,
      totalPages,
      postsPerPage: POSTS_PER_PAGE,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is an Astro-powered static blog focused on Math, Philosophy, and Code. Astro is a modern static site generator that allows you to build fast, content-focused websites.

## Key Technologies

- **Astro 5.16.8**: Static site generation framework
- **TypeScript 5.9.3**: Type-safe development
- **KaTeX**: Mathematical typesetting
- **Shiki**: Syntax highlighting (GitHub Light theme)
- **npm**: Dependency management

## Commonly Used Commands

### Development
```bash
# Install all dependencies
npm install

# Start development server with hot reloading
npm run dev

# Build for production (includes type checking)
npm run build

# Preview production build locally
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Project Structure

```
my-website/
├── src/
│   ├── components/        # Reusable Astro components
│   │   ├── Nav.astro      # Navigation
│   │   ├── Profile.astro  # Sidebar/profile
│   │   ├── PostCard.astro # Blog post card
│   │   ├── CategoryTabs.astro # Category navigation
│   │   └── Pagination.astro # Pagination
│   ├── layouts/           # Page layouts
│   │   └── BaseLayout.astro # Main layout with KaTeX integration
│   ├── pages/             # Astro pages (routes)
│   │   ├── index.astro    # Home page with dynamic feed loading
│   │   ├── posts/
│   │   │   └── [slug].astro # Dynamic blog post page
│   │   └── data/
│   │       └── posts-[category].json.ts # Posts by category API endpoint
│   ├── scripts/           # Client-side TypeScript
│   │   └── feedsManager.ts # Manages dynamic post loading and caching
│   └── content/           # Content collections
│       ├── config.ts      # Content schema definitions
│       └── posts/         # Blog posts in Markdown format (45 posts)
├── public/                # Static assets (images, fonts)
├── astro.config.mjs       # Astro configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Architecture Overview

### Content Schema

Blog posts use the following frontmatter schema:
```typescript
{
  title: string;
  tags: ["math" | "philosophy" | "code" | "other"][];
  createdAt: string;
  origin?: string;
  excerpt?: string;
}
```

### Key Features

1. **Static Site Generation**: Astro generates static HTML at build time
2. **Dynamic Feed Loading**: Client-side JavaScript (feedsManager.ts) loads posts dynamically with pagination
3. **Category Filtering**: Posts are categorized into math/philosophy/code/other
4. **Markdown Processing**:
   - Math rendering via KaTeX
   - Syntax highlighting via Shiki (GitHub Light theme)
   - Custom image replacement plugin
5. **Responsive Design**: Mobile-friendly layout with CSS variables

### Performance Optimizations

- Client-side caching of category data
- Dynamic imports
- Static generation for all routes
- Optimized images in public folder

## Deployment

The site is configured for GitHub Pages deployment:
- Production base URL: `/my-website`
- Development base URL: `/`
- Deploy script: `npm run deploy` (builds and pushes to gh-pages branch)

## Configuration Files

### astro.config.mjs
- Markdown plugins: remark-math, rehype-katex, unified ecosystem
- GitHub Pages deployment base configuration
- Shiki syntax highlighting with GitHub Light theme

### tsconfig.json
- Extends Astro's strict preset
- Path aliases: @/*, @components/*, @layouts/*, @styles/*

## Recent Changes (January 2026)

### Blockquote Styling Fixes
- **Issue**: Quote blocks had alignment issues where the left vertical bar was higher than text content
- **Solution**: Replaced `border-left` with `::before` pseudo-element in `src/pages/posts/[slug].astro:125-142`
- **Preview fix**: Added global blockquote styles to `src/layouts/BaseLayout.astro:83-98` for dynamic content

### Excerpt Display Redesign
- **Removed**: "Abstract: " prefix from post previews
- **New layout**:
  - Excerpt content displayed as plain text (no trailing ellipsis)
  - "阅读全文……" link in bottom-left corner with subtle blue styling
  - Creation date in bottom-right corner
- **Components updated**:
  - `src/components/PostCard.astro`: Added `.post-footer` with flexbox layout
  - `src/scripts/feedsManager.ts`: Updated HTML template to match new design
  - `src/pages/index.astro`: Added global styles for `.post-footer` and `.read-more`
  - `src/pages/data/posts-[category].json.ts`: Removed text ellipsis from `extractExcerpt()` function

### CSS Changes Summary
- Blockquote now uses `position: relative` with `::before` pseudo-element for precise vertical alignment
- Post preview footer uses flexbox with `justify-content: space-between`
- "阅读全文……" link has subtle blue color (`rgba(59, 130, 246, 0.9)`) with hover effects

```
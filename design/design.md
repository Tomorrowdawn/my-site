# 网站设计规格说明书

## 项目概述

- **网站类型**: 个人博客网站
- **目标受众**: 数学，算法，技术，哲学同好；潜在雇主
- **发布平台**: GitHub Pages
- **技术栈**: Astro + 响应式设计 + Bun

## 核心功能需求

### 设计哲学

尽可能手写原生的html/css/js（这正是astro推崇的），保持Unix哲学。
在此基础上，有一个针对博客内容的设计。

博客内容的储存形式：MD/HTML. 使用HTML以实现最大程度的富文本支持。

每个页面被分离成为模板 + 数据。这意味着布局相同的页面复用完全一样的模板，而只有内容发生了变化。在技术上，我们通过提供条件渲染来完成这一点：区分编辑时和发布时。例如同一个组件，在编辑时会被渲染成input标签，而发布时就是普通的span.

此外，我们还需要提供一个编辑器，以便于加载，编辑，储存这些HTML内容。

### 上下文

上下文为组件提供了访问数据的能力。组件依赖于上下文，组件所需的数据（json）从上下文中提取。

在编辑状态，上下文中可能不包含数据，或者之前的数据。
在发布状态，需要先行向上下文中注入储存好的数据。

### 组件

一个组件就是一个普通的Astro组件。它有一个上下文输入，传递内部所需的数据。
一个组件有两种形态：

1. 可编辑的。这种情况下，组件渲染时会形成可输入的表单。它将生成所需的json并传递给上下文。
2. 发布状态。这种情况下，组件会从上下文获取数据，并渲染成静态HTML以供astro发布。

### 模板

模板是一个astro（或多个astro）文件。它是一系列组件的集合。

### 页面

一个页面等于填充了数据的模板。


## 分阶段实施路线

四个阶段按优先级逐步推进，每个阶段在保证产出可上线的前提下，为下一阶段预留接口。

### 阶段一：Markdown + Astro 基线

- 目录结构  
  - `src/layouts/` 放置手写布局（首页、文章页、侧栏等），所有页面共享 `BaseLayout.astro`。  
  - `src/content/posts/<slug>/index.md` 存放文章。slug 由目录名唯一标识，frontmatter 记录 `title`, `tags`, `createdAt`, `origin`, `excerpt`。同目录可包含 `images/` 供 Markdown 通过相对路径引用。  
  - `src/pages/*.astro` 用于自定义最终渲染的静态页面。这些页面会复用布局，并且通常不被其他页面复用。可通过动态路由等方式动态加载md文件渲染。
- Markdown 渲染  
  - 使用 `@astrojs/markdown-remark`、`remark-math`、`rehype-katex`，并在 `src/styles/katex.css` 引入所需样式。  
  - 文章列表与详情通过 Astro Content Collections 构建，后续替换数据源时继续复用同一套组件与上下文机制。
- 迁移知乎文章 
  - 在本地仓库之外维护导入脚本，读取 `../zhihu-crawler` 产物，清洗为 Markdown 写入 `src/content/posts/<slug>/index.md`（按 slug 建目录）。此脚本仅作为离线工具，不提交到 git。  
  - 提供 `scripts/validate-content.mjs` 校验 frontmatter 完整、slug 唯一、数学公式渲染正常。
- 发布流程  
  - `package.json` 增加 `deploy` 脚本：`astro check && astro build && npx gh-pages -d dist` 或 GitHub Actions 工作流。  
  - `.github/workflows/deploy.yml` 使用 `astro build --site https://<user>.github.io/<repo>/`，发布到 GitHub Pages。  
  - 阶段末整理 `docs/extension.md`，写清楚未来替换内容源所需的接口（`fetchPosts()`, `fetchPost(slug)` 等），确保组件与数据解耦。

### 阶段二：Supabase 认证与素材托管

- 仓库调整  
  - 新建仓库或重写历史，避免旧图片留在 Git 对象中。老仓库归档作为只读备份。  
  - `.gitignore` 忽略 `media/` 等本地缓存目录，确保之后的图片只存在于 Supabase。
- Supabase 配置  
  - 创建 project，启用 GitHub OAuth，记录 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY`。  
  - 新建 storage bucket `media`，RLS 规则：匿名可读，登录用户可写。  
  - 在 Astro 端创建 `src/lib/supabaseClient.ts` 供浏览器端管理页面使用。
- 登录与素材迁移  
  - 新增 `/admin/login` 页面，使用 `@supabase/auth-helpers-astro` 完成 GitHub 登录；其余 `/admin/*` 路由通过中间层检查 session。  
  - 编写 `scripts/move-assets.ts`：遍历 `src/content/posts` 中的本地图片，上传至 Supabase，返回公共 URL 并回写 Markdown。  
  - 更新 Markdown 引用为远程地址后，仓库中不再保留二进制媒体。

### 阶段三：Markdown + HTML 双源内容

- 目录规范  
  - 对于每篇文章创建独立目录 `src/content/posts/<slug>/`，其中 `index.md` 用于兼容老版本，`index.html` 存放富文本版本，`meta.json` 记录标题、状态、首发渠道、上次编辑方式。  
  - 若存在 `index.html` 则渲染 HTML，否则回退 Markdown。Astro 中通过 `resolvePost(slug)` 封装读取逻辑，向上下文暴露统一的 `PostContent` 对象。
- 构建与校验  
  - 在 `astro.config.mjs` 里注册自定义 content 集合，允许导入 HTML（读取为字符串）并应用 sanitize。  
  - 样式使用统一的 `.post-body`，让 Markdown/HTML 共用 CSS。  
  - `pnpm content:lint` 检查：HTML 文件禁止 `<script>`, 图片必须指向 Supabase 域名，meta 与目录名保持一致。
- 迁移策略  
  - 对现有 Markdown 运行 `scripts/md-to-html.ts` 生成初稿 HTML，人工微调后提交。  
  - 仍保留 Markdown 以便 diff 与备份，Git 继续承担版本记录。

### 阶段四：在线富文本编辑器

- 页面与路由  
  - 新增 `src/pages/admin/edit/[slug].astro`，在其中挂载 React/Svelte 岛（使用TipTap）。  
  - 进入页面后先通过 Supabase 拉取 `meta` + `index.html`/`index.md`，用于初始化编辑器。  
  - 支持草稿自动保存（写入 Supabase `drafts` 表）与“发布”按钮。
- 编辑
  主要储存放在前端。定时地与supabase后端同步防止丢失内容。允许储存草稿。编辑期间不会触发推送。
- 保存与发布流程  
  - 按下发布按钮之后：编辑器输出 HTML：  
    1. 上传嵌入的图片到 Supabase storage，替换为公共 URL。  
    2. 通过 GitHub API（PAT 或 Supabase Edge Function 内的 service role）将 HTML 写入 `src/content/posts/<slug>/`，触发 PR 或直接 commit。  
    3. GitHub Actions 监听变动自动重新部署。  
  - 注意编辑器不会输出md以避免重复储存。
- 权限与体验  
  - 使用阶段二的 GitHub OAuth，额外在前端检查 GitHub handle 白名单。  
  - 工具栏包含表格、数学、代码块、引用等，输出 HTML 必须符合阶段三定义的约束（无内联脚本、语义化标签）。

该路线确保每阶段都具备可交付成果，同时后续阶段只需替换数据来源与新增页面，不会破坏已有模板与上下文机制。

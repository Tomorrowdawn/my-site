interface Post {
  title: string;
  slug: string;
  date: string;
  excerptHtml: string;
  tags: string[];
}

interface CategoryData {
  posts: Post[];
  totalPages: number;
  postsPerPage: number;
}

interface CachedData {
  data: CategoryData;
  timestamp: number;
}

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `feeds-cache-${CACHE_VERSION}-`;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

class FeedsManager {
  private cache = new Map<string, CategoryData>();
  private currentCategory = "all";
  private currentPage = 1;
  private postsPerPage = 10;

  async init() {
    this.cleanupExpiredCache();

    const url = new URL(window.location.href);
    this.currentCategory = url.searchParams.get("category") || "all";
    this.currentPage = parseInt(url.searchParams.get("page") || "1");

    await this.loadAndRender();

    this.attachEventListeners();
    window.addEventListener("popstate", () => this.handlePopState());
  }

  private cleanupExpiredCache(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const cachedData: CachedData = JSON.parse(item);
              const age = Date.now() - cachedData.timestamp;
              if (age > CACHE_EXPIRY_MS) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // 如果解析失败，删除无效的缓存项
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      // localStorage 可能不可用，静默失败
      console.warn("Failed to cleanup expired cache:", error);
    }
  }

  private getCachedData(category: string): CategoryData | null {
    try {
      const key = `${CACHE_PREFIX}${category}`;
      const item = localStorage.getItem(key);
      if (!item) return null;

      const cachedData: CachedData = JSON.parse(item);
      const age = Date.now() - cachedData.timestamp;

      if (age > CACHE_EXPIRY_MS) {
        // 缓存过期，删除
        localStorage.removeItem(key);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      // 如果解析失败或 localStorage 不可用，返回 null
      console.warn("Failed to get cached data:", error);
      return null;
    }
  }

  private setCachedData(category: string, data: CategoryData): void {
    try {
      const key = `${CACHE_PREFIX}${category}`;
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      // localStorage 可能已满或不可用，静默失败
      console.warn("Failed to set cached data:", error);
    }
  }

  private async loadCategory(category: string): Promise<CategoryData> {
    // 1. 检查内存缓存
    if (this.cache.has(category)) {
      return this.cache.get(category)!;
    }

    // 2. 检查 localStorage 缓存
    const cachedData = this.getCachedData(category);
    if (cachedData) {
      // 存入内存缓存以便下次快速访问
      this.cache.set(category, cachedData);
      return cachedData;
    }

    // 3. 从服务器获取
    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const response = await fetch(`${normalizedBase}data/posts-${category}.json`);
    const data: CategoryData = await response.json();

    // 4. 更新缓存
    this.cache.set(category, data);
    this.setCachedData(category, data);

    return data;
  }

  private async loadAndRender() {
    const data = await this.loadCategory(this.currentCategory);
    this.postsPerPage = data.postsPerPage;
    this.updateTabsActive();
    this.renderPosts(data);
    this.renderPagination(data.totalPages);
  }

  private updateTabsActive() {
    const tabs = document.querySelectorAll(".category-tabs .tab");
    tabs.forEach((tab) => {
      if (!(tab instanceof HTMLAnchorElement)) return;
      
      const url = new URL(tab.href);
      const tabCategory = url.searchParams.get("category") || "all";
      
      if (tabCategory === this.currentCategory) {
        tab.classList.add("active");
        tab.setAttribute("aria-current", "page");
      } else {
        tab.classList.remove("active");
        tab.removeAttribute("aria-current");
      }
    });
  }

  private renderPosts(data: CategoryData) {
    const startIndex = (this.currentPage - 1) * this.postsPerPage;
    const endIndex = startIndex + this.postsPerPage;
    const paginatedPosts = data.posts.slice(startIndex, endIndex);

    const postsContainer = document.querySelector(".posts");
    if (!postsContainer) return;

    if (paginatedPosts.length === 0) {
      postsContainer.innerHTML = '<p class="no-posts">No posts found.</p>';
      return;
    }

    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;

    postsContainer.innerHTML = paginatedPosts
      .map(
        (post) => `
      <article class="post-card">
        <h2 class="post-title">
          <a class="post-link" href="${normalizedBase}posts/${post.slug}">
            ${post.title}
          </a>
        </h2>
        <div class="post-meta">
          ${post.excerptHtml ? `<div class="post-excerpt">${post.excerptHtml}</div>` : ""}
          <div class="post-footer">
            <a class="read-more" href="${normalizedBase}posts/${post.slug}">阅读全文……</a>
            <span class="post-date">${post.date}</span>
          </div>
        </div>
      </article>
    `
      )
      .join("");
  }

  private renderPagination(totalPages: number) {
    const paginationContainer = document.querySelector(".pagination-container");
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const baseUrl =
      this.currentCategory === "all"
        ? normalizedBase
        : `${normalizedBase}?category=${this.currentCategory}`;

    const getPageUrl = (page: number): string => {
      if (page === 1) return baseUrl;
      return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${page}`;
    };

    let html = '<nav class="pagination">';

    if (this.currentPage > 1) {
      html += `
        <a href="${getPageUrl(this.currentPage - 1)}" class="page-link prev" data-feeds-link>
          &larr; Prev
        </a>
      `;
    }

    html += `
      <span class="page-info">
        Page ${this.currentPage} of ${totalPages}
      </span>
    `;

    if (this.currentPage < totalPages) {
      html += `
        <a href="${getPageUrl(this.currentPage + 1)}" class="page-link next" data-feeds-link>
          Next &rarr;
        </a>
      `;
    }

    html += "</nav>";

    paginationContainer.innerHTML = html;
  }

  private attachEventListeners() {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[data-feeds-link]");
      if (!link || !(link instanceof HTMLAnchorElement)) return;

      e.preventDefault();

      // 解析链接的路径和搜索参数，避免重复添加 base 路径
      const url = new URL(link.href);
      const newCategory = url.searchParams.get("category") || "all";
      const newPage = parseInt(url.searchParams.get("page") || "1");

      if (newCategory !== this.currentCategory) {
        this.currentCategory = newCategory;
        this.currentPage = 1;
      } else {
        this.currentPage = newPage;
      }

      // 构建正确的相对路径，使用 link.getAttribute('href') 而不是完整 URL
      window.history.pushState({}, "", link.getAttribute('href'));
      this.loadAndRender();
    });
  }

  private async handlePopState() {
    const url = new URL(window.location.href);
    this.currentCategory = url.searchParams.get("category") || "all";
    this.currentPage = parseInt(url.searchParams.get("page") || "1");
    await this.loadAndRender();
  }
}

if (typeof window !== "undefined") {
  const manager = new FeedsManager();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => manager.init());
  } else {
    manager.init();
  }
}

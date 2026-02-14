const l="feeds-cache-v1-";class d{cache=new Map;currentCategory="all";currentPage=1;postsPerPage=10;async init(){this.cleanupExpiredCache();const e=new URL(window.location.href);this.currentCategory=e.searchParams.get("category")||"all",this.currentPage=parseInt(e.searchParams.get("page")||"1"),await this.loadAndRender(),this.attachEventListeners(),window.addEventListener("popstate",()=>this.handlePopState())}cleanupExpiredCache(){try{for(let e=0;e<localStorage.length;e++){const t=localStorage.key(e);if(t&&t.startsWith(l))try{const a=localStorage.getItem(t);if(a){const s=JSON.parse(a);Date.now()-s.timestamp>864e5&&localStorage.removeItem(t)}}catch{localStorage.removeItem(t)}}}catch(e){console.warn("Failed to cleanup expired cache:",e)}}getCachedData(e){try{const t=`${l}${e}`,a=localStorage.getItem(t);if(!a)return null;const s=JSON.parse(a);return Date.now()-s.timestamp>864e5?(localStorage.removeItem(t),null):s.data}catch(t){return console.warn("Failed to get cached data:",t),null}}setCachedData(e,t){try{const a=`${l}${e}`,s={data:t,timestamp:Date.now()};localStorage.setItem(a,JSON.stringify(s))}catch(a){console.warn("Failed to set cached data:",a)}}async loadCategory(e){if(this.cache.has(e))return this.cache.get(e);const t=this.getCachedData(e);if(t)return this.cache.set(e,t),t;const a="/",s=a.endsWith("/")?a:`${a}/`,n=await(await fetch(`${s}data/posts-${e}.json`)).json();return this.cache.set(e,n),this.setCachedData(e,n),n}async loadAndRender(){const e=await this.loadCategory(this.currentCategory);this.postsPerPage=e.postsPerPage,this.updateTabsActive(),this.renderPosts(e),this.renderPagination(e.totalPages)}updateTabsActive(){document.querySelectorAll(".category-tabs .tab").forEach(t=>{if(!(t instanceof HTMLAnchorElement))return;(new URL(t.href).searchParams.get("category")||"all")===this.currentCategory?(t.classList.add("active"),t.setAttribute("aria-current","page")):(t.classList.remove("active"),t.removeAttribute("aria-current"))})}renderPosts(e){const t=(this.currentPage-1)*this.postsPerPage,a=t+this.postsPerPage,s=e.posts.slice(t,a),r=document.querySelector(".posts");if(!r)return;if(s.length===0){r.innerHTML='<p class="no-posts">No posts found.</p>';return}const n="/",o=n.endsWith("/")?n:`${n}/`;r.innerHTML=s.map(c=>`
      <article class="post-card">
        <h2 class="post-title">
          <a class="post-link" href="${o}posts/${c.slug}">
            ${c.title}
          </a>
        </h2>
        <div class="post-meta">
          ${c.excerptHtml?`<div class="post-excerpt">${c.excerptHtml}</div>`:""}
          <div class="post-footer">
            <a class="read-more" href="${o}posts/${c.slug}">阅读全文……</a>
            <span class="post-date">${c.date}</span>
          </div>
        </div>
      </article>
    `).join("")}renderPagination(e){const t=document.querySelector(".pagination-container");if(!t)return;if(e<=1){t.innerHTML="";return}const a="/",s=a.endsWith("/")?a:`${a}/`,r=this.currentCategory==="all"?s:`${s}?category=${this.currentCategory}`,n=c=>c===1?r:`${r}${r.includes("?")?"&":"?"}page=${c}`;let o='<nav class="pagination">';this.currentPage>1&&(o+=`
        <a href="${n(this.currentPage-1)}" class="page-link prev" data-feeds-link>
          &larr; Prev
        </a>
      `),o+=`
      <span class="page-info">
        Page ${this.currentPage} of ${e}
      </span>
    `,this.currentPage<e&&(o+=`
        <a href="${n(this.currentPage+1)}" class="page-link next" data-feeds-link>
          Next &rarr;
        </a>
      `),o+="</nav>",t.innerHTML=o}attachEventListeners(){document.addEventListener("click",e=>{const a=e.target.closest("a[data-feeds-link]");if(!a||!(a instanceof HTMLAnchorElement))return;e.preventDefault();const s=new URL(a.href),r=s.searchParams.get("category")||"all",n=parseInt(s.searchParams.get("page")||"1");r!==this.currentCategory?(this.currentCategory=r,this.currentPage=1):this.currentPage=n,window.history.pushState({},"",a.getAttribute("href")),this.loadAndRender()})}async handlePopState(){const e=new URL(window.location.href);this.currentCategory=e.searchParams.get("category")||"all",this.currentPage=parseInt(e.searchParams.get("page")||"1"),await this.loadAndRender()}}if(typeof window<"u"){const i=new d;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>i.init()):i.init()}

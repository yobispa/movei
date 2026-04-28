(function () {
  const apiKey = "65524069e4ea44679ec9be59c6ac99b4";
  const apiBase = "https://api.themoviedb.org/3";
  const imageBase = "https://image.tmdb.org/t/p";
  const genreCache = {};

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function truncate(value = "", maxLength = 120) {
    const cleaned = String(value || "").trim();
    if (!cleaned) {
      return "";
    }
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength).trimEnd()}...`;
  }

  function buildImageUrl(path, size = "w780") {
    return path ? `${imageBase}/${size}${path}` : "";
  }

  function formatDate(value) {
    if (!value) {
      return "Coming soon";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function formatYear(value) {
    return value ? String(value).slice(0, 4) : "TBA";
  }

  function formatVote(value) {
    if (!value) {
      return "N/A";
    }
    return Number(value).toFixed(1);
  }

  function formatRuntime(value) {
    if (!value) {
      return "TBA";
    }
    const totalMinutes = Number(value);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function formatNumber(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return "0";
    }
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric);
  }

  function resolveMediaType(item, fallback = "movie") {
    if (item?.media_type === "tv" || (!item?.media_type && item?.name && !item?.title)) {
      return "tv";
    }
    if (item?.media_type === "movie" || item?.title) {
      return "movie";
    }
    return fallback;
  }

  function createBadge(label, accent = false) {
    return `<span class="meta-badge${accent ? " meta-badge--accent" : ""}">${escapeHtml(label)}</span>`;
  }

  function joinGenres(item, genreMap, limit = 2) {
    if (!genreMap || !Array.isArray(item?.genre_ids)) {
      return [];
    }
    return item.genre_ids.map((genreId) => genreMap.get(genreId)).filter(Boolean).slice(0, limit);
  }

  function createMetricCard(label, value) {
    return `
      <div class="stat-card">
        <span class="stat-card__value">${escapeHtml(String(value))}</span>
        <span class="stat-card__label">${escapeHtml(label)}</span>
      </div>
    `;
  }

  function createPosterCard(item, options = {}) {
    const mediaType = options.mediaType || resolveMediaType(item, options.fallbackMediaType || "movie");
    const title = escapeHtml(item.title || item.name || "Untitled");
    const year = formatYear(item.release_date || item.first_air_date);
    const overview = escapeHtml(truncate(item.overview || "A polished pick from the catalog.", 120));
    const image = item.poster_path
      ? `<img class="poster-card__image" src="${buildImageUrl(item.poster_path, "w500")}" alt="${title}">`
      : `<div class="poster-card__placeholder">${title.charAt(0)}</div>`;

    const badges = [
      createBadge(mediaType === "movie" ? "Movie" : "Series", true),
      createBadge(year),
      ...joinGenres(item, options.genreMap, 2).map((genre) => createBadge(genre)),
    ].join("");

    return `
      <a class="poster-card" href="${mediaType}.html?id=${item.id}">
        <div class="poster-card__media">
          ${image}
          <div class="poster-card__score">
            <i class="bi bi-star-fill"></i>
            ${formatVote(item.vote_average)}
          </div>
        </div>
        <div class="poster-card__body">
          <div>
            <div class="meta-badges">${badges}</div>
            <h3 class="poster-card__heading">${title}</h3>
          </div>
          <p class="poster-card__overview">${overview}</p>
          <div class="poster-card__footer">
            <span class="poster-card__cta">Open details <i class="bi bi-arrow-up-right"></i></span>
          </div>
        </div>
      </a>
    `;
  }

  function createRailCard(item, options = {}) {
    const mediaType = options.mediaType || resolveMediaType(item, options.fallbackMediaType || "movie");
    const title = escapeHtml(item.title || item.name || "Untitled");
    const overview = escapeHtml(truncate(item.overview || "One of the sharper picks in the lineup.", 110));
    const year = formatYear(item.release_date || item.first_air_date);
    const image = item.backdrop_path
      ? `<img class="rail-card__image" src="${buildImageUrl(item.backdrop_path, "w780")}" alt="${title}">`
      : `<div class="rail-card__placeholder">${title.charAt(0)}</div>`;

    const badges = [
      createBadge(mediaType === "movie" ? "Movie" : "Series", true),
      createBadge(year),
      ...joinGenres(item, options.genreMap, 2).map((genre) => createBadge(genre)),
    ].join("");

    return `
      <a class="rail-card" href="${mediaType}.html?id=${item.id}">
        <div class="rail-card__visual">
          ${image}
          <div class="rail-card__gradient"></div>
          <div class="rail-card__score">
            <i class="bi bi-star-fill"></i>
            ${formatVote(item.vote_average)}
          </div>
        </div>
        <div class="rail-card__body">
          <div class="meta-badges">${badges}</div>
          <h3 class="rail-card__title">${title}</h3>
          <p class="rail-card__copy">${overview}</p>
          <div class="rail-card__footer">View title <i class="bi bi-arrow-right"></i></div>
        </div>
      </a>
    `;
  }

  function renderState(container, message, variant = "loading") {
    if (!container) {
      return;
    }
    const className = variant === "empty" ? "empty-state" : "loading-state";
    container.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
  }

  async function tmdbRequest(endpoint, params = {}) {
    const url = new URL(`${apiBase}/${endpoint}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "en-US");

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDb request failed for ${endpoint}`);
    }
    return response.json();
  }

  async function getGenreMap(mediaType) {
    if (genreCache[mediaType]) {
      return genreCache[mediaType];
    }

    const data = await tmdbRequest(`genre/${mediaType}/list`);
    const map = new Map((data.genres || []).map((genre) => [genre.id, genre.name]));
    genreCache[mediaType] = map;
    return map;
  }

  function renderShell() {
    const headerTarget = document.getElementById("app-header");
    const footerTarget = document.getElementById("app-footer");
    const activeNav = document.body.dataset.nav || "home";

    if (headerTarget) {
      headerTarget.innerHTML = `
        <header class="site-header">
          <div class="site-header__inner">
            <a class="brand" href="index.html">
              <span class="brand-mark">M</span>
              <span class="brand-copy">
                <strong>Movei</strong>
                <span>Curated screen nights</span>
              </span>
            </a>

            <button class="nav-toggle" type="button" data-nav-toggle aria-label="Toggle navigation" aria-expanded="false">
              <i class="bi bi-list"></i>
            </button>

            <div class="nav-panel" data-nav-panel>
              <ul class="nav-links">
                ${[
                  { id: "home", label: "Home", href: "index.html" },
                  { id: "movies", label: "Movies", href: "movie-list.html" },
                  { id: "tv", label: "TV Shows", href: "tv-list.html" },
                  { id: "contact", label: "Contact", href: "contact.html" },
                ]
                  .map(
                    (item) =>
                      `<li><a class="${activeNav === item.id ? "is-active" : ""}" href="${item.href}">${item.label}</a></li>`
                  )
                  .join("")}
              </ul>

              <form class="site-search" action="searched.html" method="get">
                <i class="bi bi-search search-icon"></i>
                <input type="search" name="search" placeholder="Search films, series, genres..." aria-label="Search">
                <button type="submit" aria-label="Submit search">
                  <i class="bi bi-arrow-right"></i>
                </button>
              </form>
            </div>
          </div>
        </header>
      `;
    }

    if (footerTarget) {
      footerTarget.innerHTML = `
        <footer class="site-footer">
          <div class="site-footer__inner">
            <div class="footer-brand">
              <span class="eyebrow">Movei</span>
              <strong>Designed to make browsing feel cinematic again.</strong>
              <p>Movei is a polished discovery layer for movies and TV, built to feel curated, warm, and intentional instead of noisy and disposable.</p>
            </div>

            <div class="footer-group">
              <h3>Browse</h3>
              <div class="footer-links">
                <a href="index.html">Home</a>
                <a href="movie-list.html">Movies</a>
                <a href="tv-list.html">TV Shows</a>
                <a href="contact.html">Contact</a>
              </div>
            </div>

            <div class="footer-group">
              <h3>Quick Notes</h3>
              <p>Search instantly, filter by genre, open trailers, and jump straight into a premium-feeling catalog flow.</p>
            </div>
          </div>

          <div class="footer-bottom">
            <span>&copy; ${new Date().getFullYear()} Movei</span>
            <span>Educational project, redesigned with a premium product direction.</span>
          </div>
        </footer>
      `;
    }

    const currentSearch = new URLSearchParams(window.location.search).get("search") || "";
    document.querySelectorAll('input[name="search"]').forEach((input) => {
      input.value = currentSearch;
    });

    const navToggle = document.querySelector("[data-nav-toggle]");
    const navPanel = document.querySelector("[data-nav-panel]");

    if (navToggle && navPanel) {
      navToggle.addEventListener("click", () => {
        const isOpen = navPanel.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
      });

      document.querySelectorAll(".nav-links a").forEach((link) => {
        link.addEventListener("click", () => {
          navPanel.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        });
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 920) {
          navPanel.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  window.MoveiApp = {
    buildImageUrl,
    createBadge,
    createMetricCard,
    createPosterCard,
    createRailCard,
    escapeHtml,
    formatDate,
    formatNumber,
    formatRuntime,
    formatVote,
    formatYear,
    getGenreMap,
    joinGenres,
    renderState,
    resolveMediaType,
    tmdbRequest,
    truncate,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderShell);
  } else {
    renderShell();
  }
})();

(function () {
  async function initHome() {
    const carouselContainer = document.getElementById("carousel-container");
    if (!carouselContainer || !window.MoveiApp) {
      return;
    }

    const {
      tmdbRequest,
      getGenreMap,
      createRailCard,
      createMetricCard,
      createBadge,
      buildImageUrl,
      escapeHtml,
      truncate,
      formatVote,
      formatYear,
      joinGenres,
      resolveMediaType,
      renderState,
    } = window.MoveiApp;

    const heroStats = document.getElementById("hero-stats");
    const spotlightStack = document.getElementById("spotlight-stack");

    try {
      const [movieGenres, tvGenres, trending, popularMovies, topRatedTv] = await Promise.all([
        getGenreMap("movie"),
        getGenreMap("tv"),
        tmdbRequest("trending/all/week"),
        tmdbRequest("movie/popular"),
        tmdbRequest("tv/top_rated"),
      ]);

      const combinedGenres = new Map([...movieGenres, ...tvGenres]);
      const heroItems = (trending.results || []).filter((item) => {
        const mediaType = resolveMediaType(item, item.media_type);
        return (mediaType === "movie" || mediaType === "tv") && item.backdrop_path;
      }).slice(0, 4);

      const popularItems = (popularMovies.results || []).filter((item) => item.backdrop_path || item.poster_path);
      const prestigeItems = (topRatedTv.results || []).filter((item) => item.backdrop_path || item.poster_path);

      if (!heroItems.length) {
        renderState(document.getElementById("carouselExample"), "The featured spotlight is taking a quick intermission.", "empty");
      } else {
        carouselContainer.innerHTML = heroItems.map((item, index) => createHeroSlide(item, index, combinedGenres)).join("");
      }

      if (heroStats) {
        const combinedScores = [...popularItems.slice(0, 6), ...prestigeItems.slice(0, 6)]
          .map((item) => item.vote_average)
          .filter(Boolean);
        const averageScore = combinedScores.length
          ? (combinedScores.reduce((total, score) => total + score, 0) / combinedScores.length).toFixed(1)
          : "0.0";

        heroStats.innerHTML = [
          createMetricCard("Live titles loaded", popularItems.length + prestigeItems.length),
          createMetricCard("Average audience score", `${averageScore}/10`),
          createMetricCard("Curated watch lanes", 3),
        ].join("");
      }

      if (spotlightStack) {
        spotlightStack.innerHTML = heroItems
          .slice(0, 3)
          .map((item) => createSpotlightItem(item, combinedGenres))
          .join("");
      }

      renderRail("popular-swiper", popularItems, movieGenres);
      renderRail("prestige-swiper", prestigeItems, tvGenres);

      const mixedEditors = [...heroItems, ...popularItems, ...prestigeItems]
        .filter((item, index, collection) => collection.findIndex((entry) => entry.id === item.id && resolveMediaType(entry) === resolveMediaType(item)) === index)
        .slice(0, 12);

      renderRail("editors-swiper", mixedEditors, combinedGenres);
      initSwiper("#popular-swiper", "#popular-swiper .swiper-button-next", "#popular-swiper .swiper-button-prev");
      initSwiper("#prestige-swiper", "#prestige-swiper .swiper-button-next", "#prestige-swiper .swiper-button-prev");
      initSwiper("#editors-swiper", "#editors-swiper .swiper-button-next", "#editors-swiper .swiper-button-prev");
    } catch (error) {
      console.error("Home page render failed:", error);
      renderState(document.getElementById("carouselExample"), "We couldn't load the front page highlights right now.", "empty");
      if (spotlightStack) {
        renderState(spotlightStack, "Spotlight picks are unavailable at the moment.", "empty");
      }
    }

    function createHeroSlide(item, index, genreMap) {
      const mediaType = resolveMediaType(item, item.media_type || "movie");
      const title = escapeHtml(item.title || item.name || "Untitled");
      const overview = escapeHtml(truncate(item.overview || "A standout pick from tonight's most talked-about titles.", 185));
      const year = formatYear(item.release_date || item.first_air_date);
      const genreBadges = joinGenres(item, genreMap, 3).map((genre) => createBadge(genre)).join("");
      const mediaLabel = mediaType === "movie" ? "Feature film" : "Series";

      return `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
          <div class="hero-slide">
            <img class="hero-slide__image" src="${buildImageUrl(item.backdrop_path, "w1280")}" alt="${title}">
            <div class="hero-slide__overlay"></div>
            <div class="hero-slide__body">
              <div class="meta-badges">
                ${createBadge(mediaLabel, true)}
                ${createBadge(year)}
                ${genreBadges}
              </div>
              <h2 class="hero-slide__title">${title}</h2>
              <p class="hero-slide__overview">${overview}</p>
              <div class="hero-actions">
                <a class="btn-brand" href="${mediaType}.html?id=${item.id}">
                  <i class="bi bi-play-fill"></i>
                  Open details
                </a>
                <a class="btn-ghost" href="${mediaType === "movie" ? "movie-list.html" : "tv-list.html"}">
                  Explore ${mediaType === "movie" ? "movies" : "series"}
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function createSpotlightItem(item, genreMap) {
      const mediaType = resolveMediaType(item, item.media_type || "movie");
      const title = escapeHtml(item.title || item.name || "Untitled");
      const image = item.poster_path
        ? `<div class="spotlight-item__media"><img src="${buildImageUrl(item.poster_path, "w500")}" alt="${title}"></div>`
        : `<div class="spotlight-item__placeholder">${title.charAt(0)}</div>`;

      return `
        <a class="spotlight-item" href="${mediaType}.html?id=${item.id}">
          ${image}
          <div>
            <span class="spotlight-item__eyebrow">${mediaType === "movie" ? "Movie highlight" : "Series spotlight"}</span>
            <h3 class="spotlight-item__title">${title}</h3>
            <div class="meta-badges">
              ${createBadge(`${formatVote(item.vote_average)}/10`, true)}
              ${joinGenres(item, genreMap, 2).map((genre) => createBadge(genre)).join("")}
            </div>
            <p class="spotlight-item__copy">${escapeHtml(truncate(item.overview || "A polished pick for your next watch list.", 110))}</p>
            <div class="spotlight-item__footer">View selection <i class="bi bi-arrow-up-right"></i></div>
          </div>
        </a>
      `;
    }

    function renderRail(containerId, items, genreMap) {
      const wrapper = document.querySelector(`#${containerId} .swiper-wrapper`);
      if (!wrapper) {
        return;
      }

      wrapper.innerHTML = items
        .slice(0, 12)
        .map((item) =>
          `<div class="swiper-slide">${createRailCard(item, {
            mediaType: resolveMediaType(item, item.media_type || "movie"),
            genreMap,
          })}</div>`
        )
        .join("");
    }

    function initSwiper(selector, nextSelector, prevSelector) {
      if (!window.Swiper) {
        return;
      }

      new Swiper(selector, {
        slidesPerView: 1.15,
        spaceBetween: 16,
        grabCursor: true,
        breakpoints: {
          640: { slidesPerView: 1.85, spaceBetween: 18 },
          900: { slidesPerView: 2.6, spaceBetween: 20 },
          1200: { slidesPerView: 3.4, spaceBetween: 22 },
        },
        navigation: {
          nextEl: nextSelector,
          prevEl: prevSelector,
        },
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHome);
  } else {
    initHome();
  }
})();

(function () {
  async function initDetail() {
    const titleElement = document.getElementById("detail-title");
    if (!titleElement || !window.MoveiApp) {
      return;
    }

    const mediaType = document.body.dataset.detail;
    const itemId = new URLSearchParams(window.location.search).get("id");

    const backdropElement = document.getElementById("detail-backdrop");
    const posterElement = document.getElementById("detail-poster");
    const typeElement = document.getElementById("detail-type");
    const taglineElement = document.getElementById("detail-tagline");
    const badgesElement = document.getElementById("detail-badges");
    const summaryElement = document.getElementById("detail-summary");
    const metricsElement = document.getElementById("detail-metrics");
    const metaElement = document.getElementById("detail-meta");
    const playerFrame = document.getElementById("player-frame");
    const watchLink = document.getElementById("watch-link");
    const sourceButton = document.getElementById("change-source");
    const sourceStatus = document.getElementById("source-status");
    const trailerButton = document.getElementById("trailer-button");
    const trailerFrame = document.getElementById("trailer-frame");
    const recommendationsGrid = document.getElementById("recommendations");

    const {
      buildImageUrl,
      createBadge,
      createPosterCard,
      escapeHtml,
      formatDate,
      formatNumber,
      formatRuntime,
      formatVote,
      formatYear,
      getGenreMap,
      renderState,
      tmdbRequest,
    } = window.MoveiApp;

    if (!itemId) {
      titleElement.textContent = "Title not found";
      if (summaryElement) {
        summaryElement.textContent = "The requested title is missing an ID, so there isn't anything to render here yet.";
      }
      return;
    }

    const primarySource = mediaType === "movie"
      ? `https://vidsrcme.su/embed/movie/${itemId}`
      : `https://vidsrcme.su/embed/tv/${itemId}`;
    const alternateSource = mediaType === "movie"
      ? `https://vidsrc-embed.su/embed/movie/${itemId}`
      : `https://vidsrc-embed.su/embed/tv/${itemId}`;

    let currentSource = primarySource;

    if (playerFrame) {
      playerFrame.src = primarySource;
    }
    if (watchLink) {
      watchLink.href = primarySource;
    }
    if (sourceStatus) {
      sourceStatus.textContent = "Streaming with player source 1.";
    }

    sourceButton?.addEventListener("click", () => {
      currentSource = currentSource === primarySource ? alternateSource : primarySource;
      if (playerFrame) {
        playerFrame.src = currentSource;
      }
      if (watchLink) {
        watchLink.href = currentSource;
      }
      if (sourceStatus) {
        sourceStatus.textContent = currentSource === primarySource
          ? "Streaming with player source 1."
          : "Streaming with player source 2.";
      }
    });

    try {
      const [detailData, videoData, recommendationData, genreMap] = await Promise.all([
        tmdbRequest(`${mediaType}/${itemId}`),
        tmdbRequest(`${mediaType}/${itemId}/videos`),
        tmdbRequest(`${mediaType}/${itemId}/recommendations`),
        getGenreMap(mediaType),
      ]);

      renderDetail(detailData, videoData, recommendationData, genreMap);
    } catch (error) {
      console.error(`Failed to load ${mediaType} details:`, error);
      titleElement.textContent = "Title unavailable";
      if (summaryElement) {
        summaryElement.textContent = "We couldn't load this page right now.";
      }
      renderState(recommendationsGrid, "Recommendations are unavailable right now.", "empty");
    }

    function renderDetail(detailData, videoData, recommendationData, genreMap) {
      const title = detailData.title || detailData.name || "Untitled";
      const releaseDate = detailData.release_date || detailData.first_air_date;
      const genreNames = (detailData.genres || []).map((genre) => genre.name);
      const tagline = detailData.tagline || (mediaType === "movie" ? "A sharper movie detail view." : "A richer TV detail experience.");
      const trailer = (videoData.results || []).find(
        (video) => video.site === "YouTube" && /Trailer|Teaser/i.test(video.type)
      );

      document.title = `Movei | ${title}`;
      titleElement.textContent = title;
      if (typeElement) {
        typeElement.textContent = mediaType === "movie" ? "Feature Film" : "Series Detail";
      }
      if (taglineElement) {
        taglineElement.textContent = tagline;
      }
      if (summaryElement) {
        summaryElement.textContent = detailData.overview || "Overview coming soon.";
      }
      if (badgesElement) {
        badgesElement.innerHTML = [
          createBadge(mediaType === "movie" ? "Movie" : "Series", true),
          createBadge(formatYear(releaseDate)),
          ...genreNames.slice(0, 3).map((genre) => createBadge(genre)),
        ].join("");
      }
      if (backdropElement && (detailData.backdrop_path || detailData.poster_path)) {
        backdropElement.style.backgroundImage = `url(${buildImageUrl(detailData.backdrop_path || detailData.poster_path, "w1280")})`;
      }
      if (posterElement) {
        posterElement.src = detailData.poster_path
          ? buildImageUrl(detailData.poster_path, "w500")
          : createPosterFallback(title);
        posterElement.alt = title;
      }

      if (metricsElement) {
        metricsElement.innerHTML = [
          createDetailMetric("Audience score", `${formatVote(detailData.vote_average)}/10`),
          createDetailMetric(
            mediaType === "movie" ? "Runtime" : "Seasons",
            mediaType === "movie" ? formatRuntime(detailData.runtime) : formatNumber(detailData.number_of_seasons || 0)
          ),
          createDetailMetric("Year", formatYear(releaseDate)),
          createDetailMetric("Status", detailData.status || "Live"),
        ].join("");
      }

      if (metaElement) {
        const rows = mediaType === "movie"
          ? [
              ["Release date", formatDate(detailData.release_date)],
              ["Runtime", formatRuntime(detailData.runtime)],
              ["Genres", genreNames.join(", ") || "N/A"],
              ["Language", (detailData.spoken_languages || []).map((language) => language.english_name).filter(Boolean).slice(0, 2).join(", ") || detailData.original_language?.toUpperCase() || "N/A"],
              ["Studios", (detailData.production_companies || []).map((studio) => studio.name).slice(0, 3).join(", ") || "N/A"],
            ]
          : [
              ["First air date", formatDate(detailData.first_air_date)],
              ["Episodes", formatNumber(detailData.number_of_episodes || 0)],
              ["Genres", genreNames.join(", ") || "N/A"],
              ["Networks", (detailData.networks || []).map((network) => network.name).slice(0, 3).join(", ") || "N/A"],
              ["Origin", (detailData.origin_country || []).join(", ") || "N/A"],
            ];

        metaElement.innerHTML = rows
          .map(
            ([label, value]) => `
              <div class="meta-row">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
              </div>
            `
          )
          .join("");
      }

      if (trailer && trailerFrame) {
        trailerFrame.src = `https://www.youtube.com/embed/${trailer.key}`;
      } else if (trailerButton) {
        trailerButton.disabled = true;
        trailerButton.innerHTML = '<i class="bi bi-slash-circle"></i> Trailer unavailable';
      }

      if (recommendationsGrid) {
        const recommendations = (recommendationData.results || [])
          .filter((item) => item.poster_path || item.overview || item.backdrop_path)
          .slice(0, 6);

        if (!recommendations.length) {
          renderState(recommendationsGrid, "No related picks are available right now.", "empty");
        } else {
          recommendationsGrid.innerHTML = recommendations
            .map((item) => createPosterCard(item, { mediaType, genreMap }))
            .join("");
        }
      }
    }

    function createDetailMetric(label, value) {
      return `
        <div class="detail-metric">
          <span class="detail-metric__value">${escapeHtml(String(value))}</span>
          <span class="detail-metric__label">${escapeHtml(label)}</span>
        </div>
      `;
    }

    function createPosterFallback(title) {
      const initial = escapeHtml((title || "M").charAt(0).toUpperCase());
      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200">
          <rect width="800" height="1200" fill="#14161b"/>
          <rect x="48" y="48" width="704" height="1104" rx="36" fill="rgba(212,176,122,0.08)" stroke="rgba(240,201,145,0.34)" stroke-width="3"/>
          <text x="50%" y="54%" text-anchor="middle" fill="#f4efe7" font-size="220" font-family="Georgia, serif">${initial}</text>
        </svg>
      `)}`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDetail);
  } else {
    initDetail();
  }
})();

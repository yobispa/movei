(function () {
  async function initSearch() {
    const movieResults = document.getElementById("movies-results");
    if (!movieResults || !window.MoveiApp) {
      return;
    }

    const tvResults = document.getElementById("tv-results");
    const query = (new URLSearchParams(window.location.search).get("search") || "").trim();
    const queryLabel = document.getElementById("search-query");
    const totalMetric = document.getElementById("search-total");
    const movieMetric = document.getElementById("movie-count");
    const tvMetric = document.getElementById("tv-count");

    const {
      createPosterCard,
      formatNumber,
      getGenreMap,
      renderState,
      tmdbRequest,
    } = window.MoveiApp;

    if (queryLabel) {
      queryLabel.textContent = query || "Nothing yet";
    }

    if (!query) {
      renderState(movieResults, "Start with a title, genre, or vibe in the search bar above.", "empty");
      renderState(tvResults, "TV results will appear here once you search.", "empty");
      if (totalMetric) {
        totalMetric.textContent = "0";
      }
      if (movieMetric) {
        movieMetric.textContent = "0";
      }
      if (tvMetric) {
        tvMetric.textContent = "0";
      }
      return;
    }

    renderState(movieResults, `Searching movies for "${query}"...`);
    renderState(tvResults, `Searching TV shows for "${query}"...`);

    try {
      const [movieGenres, tvGenres, movieData, tvData] = await Promise.all([
        getGenreMap("movie"),
        getGenreMap("tv"),
        tmdbRequest("search/movie", { query }),
        tmdbRequest("search/tv", { query }),
      ]);

      const movieItems = (movieData.results || []).filter((item) => item.poster_path || item.overview || item.backdrop_path);
      const tvItems = (tvData.results || []).filter((item) => item.poster_path || item.overview || item.backdrop_path);

      if (totalMetric) {
        totalMetric.textContent = formatNumber((movieData.total_results || 0) + (tvData.total_results || 0));
      }
      if (movieMetric) {
        movieMetric.textContent = formatNumber(movieData.total_results || movieItems.length);
      }
      if (tvMetric) {
        tvMetric.textContent = formatNumber(tvData.total_results || tvItems.length);
      }

      renderSection(movieResults, movieItems, "No movies matched that search.", "movie", movieGenres);
      renderSection(tvResults, tvItems, "No TV shows matched that search.", "tv", tvGenres);
    } catch (error) {
      console.error("Search page render failed:", error);
      renderState(movieResults, "Movie results are unavailable right now.", "empty");
      renderState(tvResults, "TV results are unavailable right now.", "empty");
    }

    function renderSection(container, items, emptyMessage, mediaType, genreMap) {
      if (!container) {
        return;
      }
      if (!items.length) {
        renderState(container, emptyMessage, "empty");
        return;
      }

      container.innerHTML = items
        .map((item) => createPosterCard(item, { mediaType, genreMap }))
        .join("");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearch);
  } else {
    initSearch();
  }
})();

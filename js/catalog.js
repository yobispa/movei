(function () {
  async function initCatalog() {
    const grid = document.getElementById("media-grid");
    if (!grid || !window.MoveiApp) {
      return;
    }

    const mediaType = document.body.dataset.catalog;
    const label = mediaType === "movie" ? "movies" : "series";
    const genreChecklist = document.getElementById("genre-checklist");
    const activeFilters = document.getElementById("active-filters");
    const statusLine = document.getElementById("catalog-status");
    const toggleButton = document.getElementById("toggle-filters");
    const filtersPanel = document.getElementById("filters-panel");
    const applyFiltersButton = document.getElementById("apply-filters");
    const clearFiltersButton = document.getElementById("clear-filters");
    const previousButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");
    const totalMetric = document.getElementById("catalog-total");
    const filterMetric = document.getElementById("catalog-filters");
    const pageMetric = document.getElementById("catalog-page");
    const pageIndicator = document.getElementById("page-indicator");

    const {
      createPosterCard,
      formatNumber,
      getGenreMap,
      renderState,
      tmdbRequest,
    } = window.MoveiApp;

    const state = {
      page: 1,
      selectedGenres: [],
      totalPages: 1,
      totalResults: 0,
      genreMap: new Map(),
    };

    bindEvents();

    try {
      await loadGenres();
      await loadCatalog();
    } catch (error) {
      console.error(`Catalog boot failed for ${mediaType}:`, error);
      renderState(grid, `We couldn't load the ${label} right now.`, "empty");
    }

    function bindEvents() {
      toggleButton?.addEventListener("click", () => {
        filtersPanel?.classList.toggle("is-hidden");
      });

      applyFiltersButton?.addEventListener("click", async () => {
        state.selectedGenres = getSelectedGenres();
        state.page = 1;
        await loadCatalog();
      });

      clearFiltersButton?.addEventListener("click", async () => {
        document.querySelectorAll("#genre-checklist input[type='checkbox']").forEach((input) => {
          input.checked = false;
        });
        state.selectedGenres = [];
        state.page = 1;
        await loadCatalog();
      });

      previousButton?.addEventListener("click", async () => {
        if (state.page <= 1) {
          return;
        }
        state.page -= 1;
        await loadCatalog();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      nextButton?.addEventListener("click", async () => {
        if (state.page >= state.totalPages) {
          return;
        }
        state.page += 1;
        await loadCatalog();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    async function loadGenres() {
      state.genreMap = await getGenreMap(mediaType);
      if (!genreChecklist) {
        return;
      }

      genreChecklist.innerHTML = [...state.genreMap.entries()]
        .map(
          ([genreId, genreName]) => `
            <label class="chip-checkbox">
              <input type="checkbox" value="${genreId}">
              <span>${genreName}</span>
            </label>
          `
        )
        .join("");
    }

    async function loadCatalog() {
      renderState(grid, `Loading ${label}...`);

      try {
        const data = await tmdbRequest(`discover/${mediaType}`, {
          page: state.page,
          with_genres: state.selectedGenres.join(","),
        });

        const results = (data.results || []).filter((item) => item.poster_path || item.overview || item.backdrop_path);
        state.totalPages = Math.min(data.total_pages || 1, 500);
        state.totalResults = data.total_results || results.length;

        renderMetrics();
        renderCards(results);
      } catch (error) {
        console.error(`Failed to load ${mediaType} catalog:`, error);
        renderState(grid, `We couldn't load the ${label} right now.`, "empty");
      }
    }

    function renderCards(items) {
      if (!items.length) {
        renderState(grid, `No ${label} matched that filter selection.`, "empty");
        return;
      }

      grid.innerHTML = items
        .map((item) => createPosterCard(item, { mediaType, genreMap: state.genreMap }))
        .join("");
    }

    function renderMetrics() {
      const selectedNames = state.selectedGenres
        .map((genreId) => state.genreMap.get(Number(genreId)))
        .filter(Boolean);

      if (statusLine) {
        statusLine.textContent = selectedNames.length
          ? `Showing ${label} filtered by ${selectedNames.join(", ")}.`
          : `Showing the full ${label} library.`;
      }

      if (activeFilters) {
        activeFilters.innerHTML = selectedNames.length
          ? selectedNames.map((name) => `<span class="chip-tag">${name}</span>`).join("")
          : '<span class="chip-tag">All genres</span>';
      }

      if (totalMetric) {
        totalMetric.textContent = formatNumber(state.totalResults);
      }
      if (filterMetric) {
        filterMetric.textContent = selectedNames.length || "All";
      }
      if (pageMetric) {
        pageMetric.textContent = `${state.page}/${state.totalPages}`;
      }
      if (pageIndicator) {
        pageIndicator.textContent = `Page ${state.page}`;
      }

      if (previousButton) {
        previousButton.disabled = state.page <= 1;
      }
      if (nextButton) {
        nextButton.disabled = state.page >= state.totalPages;
      }
    }

    function getSelectedGenres() {
      return [...document.querySelectorAll("#genre-checklist input[type='checkbox']:checked")].map((input) => input.value);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCatalog);
  } else {
    initCatalog();
  }
})();

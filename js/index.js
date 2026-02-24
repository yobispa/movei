const apiKey = "65524069e4ea44679ec9be59c6ac99b4"; // Replace with your TMDb API key

let genreMap = new Map(); // Map to store genre IDs and names

// Function to fetch data from TMDb API
async function fetchData(endpoint, page = 1) {
  const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&language=en-US&page=${page}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || []; // Returns the array of movies or series
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Function to fetch genres and populate the genre map
async function fetchGenres() {
  try {
    // Fetch movie and TV genres
    const [movieGenres, tvGenres] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`).then((res) =>
        res.json()
      ),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=en-US`).then((res) => res.json()),
    ]);

    // Add genres to the map
    [...(movieGenres.genres || []), ...(tvGenres.genres || [])].forEach((genre) => {
      genreMap.set(genre.id, genre.name);
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
  }
}

// Function to populate the Bootstrap carousel
function populateCarousel(items) {
  const carouselContainer = document.getElementById("carousel-container");
  if (!carouselContainer) return;

  items.slice(0, 3).forEach((item, index) => {
    // Skip if missing image
    if (!item || !item.backdrop_path) return;

    const activeClass = index === 0 ? "active" : "";

    const mediaType = item.media_type || (item.title ? "movie" : "tv");
    const genreNames = (item.genre_ids || [])
      .map((id) => genreMap.get(id))
      .filter(Boolean)
      .join(", ");

    const title = item.title || item.name || "Untitled";
    const date = item.release_date || item.first_air_date || "";

    const carouselItem = `
      <div class="carousel-item ${activeClass}">
        <a href="${mediaType}.html?id=${item.id}">
          <img
            src="https://image.tmdb.org/t/p/w500${item.backdrop_path}"
            class="d-block w-100 opacity-25"
            alt="${title}"
            style="object-fit: cover; height: 100%;"
          >
          <div class="carousel-caption text-md-start text-center top-50 translate-middle-y mt-md-4 mt-0">
            <h3><b>${title} (${mediaType === "movie" ? "Movie" : "Series"})</b></h3>
            <p class="fs-6">${date} |
              <span class="text-warning">${genreNames}</span>
            </p>
            <p class="fs-5 d-md-block d-none">${item.overview || ""}</p>
            <button class="btn btn-warning d-none d-sm-block d-md-block d-lg-block text-white">Watch Now</button>
          </div>
        </a>
      </div>
    `;

    carouselContainer.innerHTML += carouselItem;
  });
}

// Ensure navigation buttons exist inside each swiper container
function ensureSwiperNav(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // If you are using old markup (.swiper-container), this still works.
  // Swiper expects these elements for navigation.
  let prev = container.querySelector(".swiper-button-prev");
  let next = container.querySelector(".swiper-button-next");

  if (!prev) {
    prev = document.createElement("div");
    prev.className = "swiper-button-prev";
    container.appendChild(prev);
  }

  if (!next) {
    next = document.createElement("div");
    next.className = "swiper-button-next";
    container.appendChild(next);
  }
}

// Function to populate Swiper.js sliders
function populateSwiper(containerId, items) {
  const swiperWrapper = document.querySelector(`#${containerId} .swiper-wrapper`);
  if (!swiperWrapper) return;

  // Clear existing slides (prevents duplicates if re-run)
  swiperWrapper.innerHTML = "";

  items.forEach((item) => {
    // Skip broken items / missing image
    if (!item || !item.backdrop_path) return;

    const mediaType = item.media_type || (item.title ? "movie" : "tv");

    const title = item.title || item.name || "Untitled";

    const swiperSlide = `
      <div class="swiper-slide">
        <a href="${mediaType}.html?id=${item.id}">
          <img src="https://image.tmdb.org/t/p/w500${item.backdrop_path}" alt="${title}">
        </a>
        <p class="text-center fs-5">${title}</p>
      </div>
    `;
    swiperWrapper.innerHTML += swiperSlide;
  });
}

// Initialize the application
(async function initializeApp() {
  await fetchGenres(); // Fetch and populate genre map

  const popularMovies = await fetchData("movie/popular"); // Popular movies
  const trendingSeries = await fetchData("tv/top_rated"); // Top rated TV series (fixed trailing comma)

  // Populate the UI
  populateCarousel([...(popularMovies || []), ...(trendingSeries || [])]); // Combine for carousel
  populateSwiper("popular-swiper", popularMovies); // Popular movies slider
  populateSwiper("trending-swiper", trendingSeries); // Trending series slider

  // Add nav buttons (if you didn't add them in HTML)
  ensureSwiperNav("popular-swiper");
  ensureSwiperNav("trending-swiper");

  // Swiper options
  const swiperOptions = {
    freeMode: true,
    spaceBetween: 5,
    centeredSlides: false,

    mousewheel: {
      forceToAxis: true,
      releaseOnEdges: true,
    },

    slidesPerView: 2,
    slidesPerGroup: 1,

    breakpoints: {
      600: { slidesPerView: 2, slidesPerGroup: 2, spaceBetween: 5 },
      900: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 5 },
      1200: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 5 },
      1500: { slidesPerView: 5, slidesPerGroup: 5, spaceBetween: 5 },
      1800: { slidesPerView: 6, slidesPerGroup: 6, spaceBetween: 5 },
    },

    // ✅ Navigation buttons (scoped per slider so they don't conflict)
    navigation: {
      nextEl: null,
      prevEl: null,
    },
  };

  // Initialize each Swiper with its own scoped navigation elements
  const popularSwiper = new Swiper("#popular-swiper", {
    ...swiperOptions,
    navigation: {
      nextEl: "#popular-swiper .swiper-button-next",
      prevEl: "#popular-swiper .swiper-button-prev",
    },
  });

  const trendingSwiper = new Swiper("#trending-swiper", {
    ...swiperOptions,
    navigation: {
      nextEl: "#trending-swiper .swiper-button-next",
      prevEl: "#trending-swiper .swiper-button-prev",
    },
  });

  // If you ever dynamically add/remove slides later, call:
  // popularSwiper.update();
  // trendingSwiper.update();
})();
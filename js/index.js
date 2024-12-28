const apiKey = "65524069e4ea44679ec9be59c6ac99b4"; // Replace with your TMDb API key

let genreMap = new Map(); // Map to store genre IDs and names

// Function to fetch data from TMDb API
async function fetchData(endpoint, page = 1) {
    const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&language=en-US&page=${page}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results; // Returns the array of movies or series
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
            fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`).then(res => res.json()),
            fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=en-US`).then(res => res.json()),
        ]);

        // Add genres to the map
        [...movieGenres.genres, ...tvGenres.genres].forEach(genre => {
            genreMap.set(genre.id, genre.name);
        });
    } catch (error) {
        console.error("Error fetching genres:", error);
    }
}



// Function to populate the Bootstrap carousel
function populateCarousel(items) {
    const carouselContainer = document.getElementById("carousel-container");
    items.slice(0, 3).forEach((item, index) => {
        const activeClass = index === 0 ? "active" : "";

        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        const genreNames = item.genre_ids.map(id => genreMap.get(id)).filter(Boolean).join(", ");

        const carouselItem = `
        <div class="carousel-item ${activeClass}">
            <a href="${mediaType}.html?id=${item.id}">
                <img src="https://image.tmdb.org/t/p/w500${item.backdrop_path}" 
                     class="d-block w-100 img-fluid opacity-25" 
                     alt="${item.title || item.name}">
                <div class="carousel-caption text-md-start text-center top-50 translate-middle-y mt-md-4 mt-0">
                    <h3><b>${item.title || item.name} (${mediaType === 'movie' ? 'Movie' : 'Series'})</b></h3>
                    <p class="fs-6">${item.release_date || item.first_air_date} | 
                        <span class="text-warning">${genreNames}</span>
                    </p>
                    <p class="fs-5 d-md-block d-none">${item.overview}</p>
                    <button class="btn btn-warning d-none d-sm-block d-md-block d-lg-block text-white">Watch Now</button>
                </div>
            </a>
        </div>
    `;
        carouselContainer.innerHTML += carouselItem;
    });
}


// Function to populate Swiper.js sliders
function populateSwiper(containerId, items) {
    const swiperWrapper = document.querySelector(`#${containerId} .swiper-wrapper`);
    items.forEach(item => {
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        // Map genre IDs to names
        const genreNames = item.genre_ids.map(id => genreMap.get(id)).filter(Boolean).join(", ");

        const swiperSlide = `
        <div class="swiper-slide">
            <a href="${mediaType}.html?id=${item.id}">
                <img src="https://image.tmdb.org/t/p/w500${item.backdrop_path}" 
                     alt="${item.title || item.name}">
            </a>
            <p class="text-center fs-5">${item.title || item.name}</p>
        </div>
    `;
        swiperWrapper.innerHTML += swiperSlide;
    });
}

// Initialize the application
(async function initializeApp() {
    await fetchGenres(); // Fetch and populate genre map

    const popularMovies = await fetchData("movie/popular"); // Popular movies
    const trendingSeries = await fetchData("tv/top_rated", );  // Trending TV series

    // Populate the UI
    populateCarousel([...popularMovies, ...trendingSeries]); // Combine movies and series for carousel
    populateSwiper("popular-swiper", popularMovies);         // Popular movies slider
    populateSwiper("trending-swiper", trendingSeries);       // Trending series slider

    // Initialize Swiper.js
    let swiper = new Swiper(".swiper-container", {
        freeMode: true,

        mousewheel: {
            forceToAxis: true,
            releaseOnEdges: true,
        },
        slidesPerView: 2,
        slidesPerGroup: 1,
        centeredSlides: false,
        breakpoints: {
            600: { slidesPerView: 2, slidesPerGroup: 2, spaceBetween: 5 },
            900: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 5 },
            1200: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 5 },
            1500: { slidesPerView: 5, slidesPerGroup: 5, spaceBetween: 5 },
            1800: { slidesPerView: 6, slidesPerGroup: 6, spaceBetween: 5 },
        }
    });
})();

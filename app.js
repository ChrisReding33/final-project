const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const searchForm = isBrowser ? document.getElementById('search-form') : null;
const searchInput = isBrowser ? document.getElementById('search-input') : null;
const ratingSlider = isBrowser ? document.getElementById('rating-slider') : null;
const ratingValue = isBrowser ? document.getElementById('rating-value') : null;
const sortSelect = isBrowser ? document.getElementById('sort-select') : null;
const resultsGrid = isBrowser ? document.getElementById('results-grid') : null;
const loading = isBrowser ? document.getElementById('loading') : null;
const status = isBrowser ? document.getElementById('status') : null;

const apiKey = '6079dd4f';
let allResults = [];
let debounceTimer;
let activeRequestId = 0;
const loadingDelayMs = 250;

function showLoading(show) {
  if (loading) {
    loading.classList.toggle('hidden', !show);
  }
}

function setStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRating(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoxOffice(value) {
  if (!value || value === 'N/A') {
    return null;
  }

  const cleanedValue = String(value).replace(/[$,]/g, '');
  const parsed = Number(cleanedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBoxOffice(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `$${value.toLocaleString()} million`;
}

function filterAndSortResults(items, query, minimumRating, sortOption) {
  const trimmedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
  const minimum = Number(minimumRating);
  const safeMinimum = Number.isFinite(minimum) ? minimum : 1;

  return items.filter((item) => {
    const title = typeof item.Title === 'string' ? item.Title.toLowerCase() : '';
    const matchesQuery = !trimmedQuery || title.includes(trimmedQuery);
    const ratingValue = parseRating(item.imdbRating);
    const matchesRating = ratingValue === null ? false : ratingValue >= safeMinimum;

    return matchesQuery && matchesRating;
  }).sort((a, b) => {
    if (sortOption === 'newest') {
      const yearA = Number(a.Year) || 0;
      const yearB = Number(b.Year) || 0;
      return yearB - yearA;
    }

    return 0;
  });
}

function renderResults(items) {
  if (!resultsGrid) {
    return;
  }

  debounceTimer = setTimeout(() => searchMovies(query), 350);
};

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchMovies(searchInput.value);
});

ratingSlider.addEventListener('input', () => {
  ratingValue.textContent = Number(ratingSlider.value).toFixed(1);
  renderResults(filterResults());
});

sortSelect.addEventListener('change', () => {
  renderResults(filterResults());
});

renderResults([]);

  resultsGrid.innerHTML = '';

  if (!items.length) {
    resultsGrid.innerHTML = '<p class="empty-state">No results match this filter yet. Try another title.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';

    const poster = item.Poster && item.Poster !== 'N/A'
      ? item.Poster
      : 'https://placehold.co/300x450?text=No+Poster';

    const rating = parseRating(item.imdbRating);
    const priceValue = parseBoxOffice(item.BoxOffice);

    card.innerHTML = `
      <img src="${poster}" alt="${item.Title} poster" />
      <div class="card-body">
        <h3>${item.Title}</h3>
        <p>${item.Year}</p>
        <p>${item.Type}</p>
        <p>⭐ ${rating !== null ? rating.toFixed(1) : 'N/A'}</p>
        <p>💰 ${priceValue !== null ? formatBoxOffice(priceValue) : 'N/A'}</p>
      </div>
    `;

    fragment.appendChild(card);
  });

  resultsGrid.appendChild(fragment);


function refreshResults() {
  const query = searchInput ? searchInput.value : '';
  const minimumRating = ratingSlider ? ratingSlider.value : 1;
  const sortOption = sortSelect ? sortSelect.value : 'default';
  const visibleResults = filterAndSortResults(allResults, query, minimumRating, sortOption);

  renderResults(visibleResults);
  setStatus(`Showing ${visibleResults.length} results.`);
}

async function enrichResults(items) {
  const detailedResults = await Promise.all(
    items.map(async (item) => {
      try {
        const response = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(item.imdbID)}`);
        const data = await response.json();
        return {
          ...item,
          imdbRating: data.imdbRating || item.imdbRating,
          BoxOffice: data.BoxOffice || item.BoxOffice
        };
      } catch (error) {
        return item;
      }
    })
  );

  return detailedResults;
}

async function searchMovies(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    allResults = [];
    renderResults([]);
    setStatus('Start typing to explore titles.');
    return;
  }

  const requestId = ++activeRequestId;
  showLoading(true);
  setStatus(`Searching for “${trimmedQuery}”...`);

  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&s=${encodeURIComponent(trimmedQuery)}`);
    const data = await response.json();

    if (requestId !== activeRequestId) {
      return;
    }

    if (data.Response === 'True') {
      const searchResults = data.Search || [];
      allResults = await enrichResults(searchResults);
      await wait(loadingDelayMs);

      if (requestId !== activeRequestId) {
        return;
      }

      refreshResults();
    } else {
      allResults = [];
      await wait(loadingDelayMs);

      if (requestId !== activeRequestId) {
        return;
      }

      renderResults([]);
      setStatus(data.Error || 'No movies found.');
    }
  } catch (error) {
    allResults = [];
    await wait(loadingDelayMs);

    if (requestId !== activeRequestId) {
      return;
    }

    renderResults([]);
    setStatus('Unable to reach the OMDb API right now.');
  } finally {
    if (requestId === activeRequestId) {
      showLoading(false);
    }
  }
}

function initializeControls() {
  if (!searchInput || !searchForm || !ratingSlider || !ratingValue || !sortSelect) {
    return;
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();

    if (!query) {
      allResults = [];
      renderResults([]);
      setStatus('Start typing to explore titles.');
      return;
    }

    if (query.length < 3) {
      setStatus('Type at least 3 characters to search.');
      return;
    }

    debounceTimer = setTimeout(() => searchMovies(query), 350);
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchMovies(searchInput.value);
  });

  ratingSlider.addEventListener('input', () => {
    ratingValue.textContent = Number(ratingSlider.value).toFixed(1);
    refreshResults();
  });

  sortSelect.addEventListener('change', () => {
    refreshResults();
  });
}

if (isBrowser) {
  initializeControls();
  if (ratingValue && ratingSlider) {
    ratingValue.textContent = Number(ratingSlider.value).toFixed(1);
  }
  renderResults([]);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterAndSortResults,
    parseRating,
    parseBoxOffice,
    formatBoxOffice
  };
}

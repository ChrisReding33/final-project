const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const ratingSlider = document.getElementById('rating-slider');
const ratingValue = document.getElementById('rating-value');
const resultsGrid = document.getElementById('results-grid');
const loading = document.getElementById('loading');
const status = document.getElementById('status');

const apiKey = '6079dd4f';
let allResults = [];
let debounceTimer;
let activeRequestId = 0;
const loadingDelayMs = 2000;

function showLoading(show) {
  loading.classList.toggle('hidden', !show);
}

function setStatus(message) {
  status.textContent = message;
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

  const cleanedValue = value.replace(/[$,]/g, '');
  const parsed = Number(cleanedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBoxOffice(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `$${value.toLocaleString()} million`;
}

function renderResults(items) {
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
}

function filterResults() {
  const minimumRating = Number(ratingSlider.value);
  return allResults.filter((item) => {
    const ratingValue = Number(item.imdbRating);
    return Number.isFinite(ratingValue) && ratingValue >= minimumRating;
  });
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

      renderResults(filterResults());
      setStatus(`Showing ${filterResults().length} results.`);
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
  renderResults(filterResults());
});

renderResults([]);

const detailContent = document.getElementById('detail-content');
const apiKey = '6079dd4f';

function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
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

async function loadMovieDetails(movieId) {
  if (!movieId) {
    detailContent.innerHTML = '<p>No movie selected.</p>';
    return;
  }

  detailContent.innerHTML = '<p>Loading movie details…</p>';

  try {
    const response = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(movieId)}`);
    const data = await response.json();

    if (data.Response !== 'True') {
      detailContent.innerHTML = '<p>Unable to load this title right now.</p>';
      return;
    }

    const rating = parseRating(data.imdbRating);
    const boxOfficeValue = parseBoxOffice(data.BoxOffice);
    const poster = data.Poster && data.Poster !== 'N/A'
      ? data.Poster
      : 'https://placehold.co/600x900?text=No+Poster';

    detailContent.innerHTML = `
      <button type="button" class="back-button" id="back-to-results">← Back to results</button>
      <div class="detail-layout">
        <img class="detail-poster" src="${poster}" alt="${data.Title} poster" />
        <div class="detail-info">
          <h1>${data.Title}</h1>
          <p><strong>Year:</strong> ${data.Year}</p>
          <p><strong>Type:</strong> ${data.Type}</p>
          <p><strong>Runtime:</strong> ${data.Runtime || 'N/A'}</p>
          <p><strong>Genre:</strong> ${data.Genre || 'N/A'}</p>
          <p><strong>Director:</strong> ${data.Director || 'N/A'}</p>
          <p><strong>Writer:</strong> ${data.Writer || 'N/A'}</p>
          <p><strong>Actors:</strong> ${data.Actors || 'N/A'}</p>
          <p><strong>Language:</strong> ${data.Language || 'N/A'}</p>
          <p><strong>Awards:</strong> ${data.Awards || 'N/A'}</p>
          <p><strong>Rated:</strong> ${data.Rated || 'N/A'}</p>
          <p><strong>IMDb Rating:</strong> ${rating !== null ? rating.toFixed(1) : 'N/A'}</p>
          <p><strong>Box Office:</strong> ${boxOfficeValue !== null ? formatBoxOffice(boxOfficeValue) : 'N/A'}</p>
          <p><strong>Plot:</strong> ${data.Plot || 'N/A'}</p>
        </div>
      </div>
    `;

    const backButton = document.getElementById('back-to-results');
    if (backButton) {
      backButton.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    }
  } catch (error) {
    detailContent.innerHTML = '<p>Unable to load this title right now.</p>';
  }
}

loadMovieDetails(getMovieIdFromUrl());

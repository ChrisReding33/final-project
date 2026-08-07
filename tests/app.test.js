const assert = require('assert');
const { filterAndSortResults } = require('../app.js');

const sampleMovies = [
  { Title: 'The Matrix', Year: '1999', Type: 'movie', imdbRating: '8.7', BoxOffice: '$171,479,930' },
  { Title: 'Inception', Year: '2010', Type: 'movie', imdbRating: '8.8', BoxOffice: '$836,836,967' },
  { Title: 'Interstellar', Year: '2014', Type: 'movie', imdbRating: '8.6', BoxOffice: '$701,729,206' }
];

const filtered = filterAndSortResults(sampleMovies, 'matrix', 8, 'default');
assert.strictEqual(filtered.length, 1);
assert.strictEqual(filtered[0].Title, 'The Matrix');

const sorted = filterAndSortResults(sampleMovies, '', 8, 'newest');
assert.deepStrictEqual(sorted.map((movie) => movie.Year), ['2014', '2010', '1999']);

console.log('app.js filtering and sorting tests passed');

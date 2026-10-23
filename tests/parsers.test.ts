import test from 'node:test';
import assert from 'node:assert/strict';
import { HtmlParser } from '../src/renderer/services/parsers';
import { computeEpisodePagination } from '../src/renderer/hooks/episodeHelpers';
import type { Episode } from '../src/types';

test('parseEpisodes reads the JSON payload', () => {
  const html =
    '<script>window.__INITIAL_STATE__ = {"episodes":[' +
    '{"id":2,"number":2,"url":"/ver/x/2"},' +
    '{"id":1,"number":1,"url":"/ver/x/1"}]};</script>';
  const episodes = new HtmlParser().parseEpisodes(html, 'x');
  assert.deepEqual(episodes.map((episode) => episode.number), [2, 1]);
});

test('parseEpisodes falls back to links and keeps gaps', () => {
  const html = [
    '<a href="/ver/slug/1">1</a>',
    '<a href="/ver/slug/3">3</a>',
    '<a href="/ver/slug/3">3 again</a>',
    '<a href="/ver/other/2">other anime</a>',
  ].join('');
  const episodes = new HtmlParser().parseEpisodes(html, 'slug');
  assert.deepEqual(episodes.map((episode) => episode.number), [1, 3]);
});

test('parseCards normalizes title, poster and slug', () => {
  const html =
    '<a class="group block" href="/anime/naruto">' +
    '<img data-src="/poster.jpg" alt="Ver Naruto Sub"></a>';
  const cards = new HtmlParser().parseCards(html);
  assert.deepEqual(cards, [
    {
      title: 'Naruto',
      image: 'https://www.animelatinohd.com/poster.jpg',
      slug: 'naruto',
      status: '',
    },
  ]);
});

test('extractRelations normalizes TMDB poster paths', () => {
  const rsc =
    'x"relations":{"prequel":[{"poster":"/a.jpg","slug":"a","name":"A"}],' +
    '"sequel":[],"related":[]}';
  const relations = new HtmlParser().extractRelations(rsc);
  assert.equal(relations?.prequel[0].poster, 'https://image.tmdb.org/t/p/w300/a.jpg');
});

test('episode pagination sorts without inventing missing numbers', () => {
  const episodes: Episode[] = [4, 1, 2].map((number) => ({
    id: `ep-${number}`,
    number,
    url: `/ver/x/${number}`,
  }));
  const { ranges, visibleEpisodes } = computeEpisodePagination(episodes, 'asc', 0);
  assert.deepEqual(ranges, [{ label: '1-4', start: 0, end: 3 }]);
  assert.deepEqual(visibleEpisodes.map((episode) => episode.number), [1, 2, 4]);
});

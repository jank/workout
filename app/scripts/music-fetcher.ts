import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { AlbumMeta, Track, AlbumData } from './lib/types';

const CACHE_DIR = path.join(__dirname, '../data/cache');
const CACHE_FILE = path.join(CACHE_DIR, 'itunes-cache.json');

// Interactive prompt for user selection
async function promptUserSelection(
  options: { label: string; value: number }[],
  prompt: string
): Promise<number | 'search' | 'manual'> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n${prompt}`);
  options.forEach((opt, i) => {
    console.log(`  [${i + 1}] ${opt.label}`);
  });
  console.log(`  [s] Search with different terms`);
  console.log(`  [i] Enter iTunes collection ID manually`);

  return new Promise((resolve) => {
    const ask = () => {
      rl.question(`\nSelect (1-${options.length}), 's' to search, or 'i' for manual ID: `, (answer) => {
        if (answer.toLowerCase() === 's') {
          rl.close();
          resolve('search');
          return;
        }
        if (answer.toLowerCase() === 'i') {
          rl.close();
          resolve('manual');
          return;
        }
        const num = parseInt(answer, 10);
        if (num >= 1 && num <= options.length) {
          rl.close();
          resolve(options[num - 1].value);
        } else {
          console.log('Invalid selection, try again.');
          ask();
        }
      });
    };
    ask();
  });
}

async function promptForSearchTerms(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nEnter search terms: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptForCollectionId(): Promise<number | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\nYou can find the iTunes collection ID by:');
  console.log('  1. Search for the album on https://music.apple.com');
  console.log('  2. The ID is in the URL: https://music.apple.com/.../album/.../<ID>');

  return new Promise((resolve) => {
    rl.question('\nEnter iTunes collection ID: ', (answer) => {
      rl.close();
      const id = parseInt(answer.trim(), 10);
      if (isNaN(id)) {
        console.log('Invalid ID, must be a number.');
        resolve(null);
      } else {
        resolve(id);
      }
    });
  });
}

interface CacheEntry {
  timestamp: number;
  data: AlbumData | null;
}

interface Cache {
  [key: string]: CacheEntry;
}

// Cache TTL: 7 days
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function loadCache(): Cache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('  Warning: Could not load cache, starting fresh');
  }
  return {};
}

function saveCache(cache: Cache): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.warn('  Warning: Could not save cache');
  }
}

function getCacheKey(artist: string, album: string, collectionId?: number): string {
  if (collectionId) {
    return `id:${collectionId}`;
  }
  return `search:${artist.toLowerCase()}:${album.toLowerCase()}`;
}

interface iTunesSearchResult {
  collectionId: number;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  collectionViewUrl: string;
}

interface iTunesTrackResult {
  wrapperType: string;
  trackId: number;
  trackName: string;
  trackTimeMillis: number;
  trackNumber: number;
  previewUrl?: string;
}

function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function artistMatches(searchArtist: string, resultArtist: string): boolean {
  const normalizedSearch = normalizeString(searchArtist);
  const normalizedResult = normalizeString(resultArtist);

  // Exact match
  if (normalizedSearch === normalizedResult) return true;

  // One contains the other
  if (normalizedSearch.includes(normalizedResult) || normalizedResult.includes(normalizedSearch)) return true;

  return false;
}

async function fetchFromiTunes(
  artist: string,
  album: string,
  collectionId?: number
): Promise<AlbumData | null> {
  try {
    let targetCollectionId: number;
    let albumMeta: AlbumMeta;

    if (collectionId) {
      // Direct lookup by collection ID
      console.log(`  Using direct collection ID: ${collectionId}`);
      const lookupUrl = `https://itunes.apple.com/lookup?id=${collectionId}`;
      const lookupRes = await fetch(lookupUrl);
      const lookupJson = await lookupRes.json();

      if (lookupJson.resultCount === 0) {
        console.error(`  Collection ID not found: ${collectionId}`);
        return null;
      }

      const result = lookupJson.results[0];
      targetCollectionId = collectionId;
      albumMeta = {
        title: result.collectionName,
        artist: result.artistName,
        coverUrl: result.artworkUrl100.replace('100x100bb', '1000x1000bb'),
        collectionId: collectionId,
        collectionViewUrl: result.collectionViewUrl?.replace(/music\.apple\.com\/[a-z]{2}\//, 'music.apple.com/').split('?')[0]
      };
    } else {
      // Search and filter by artist
      const query = encodeURIComponent(`${artist} ${album}`);
      const searchUrl = `https://itunes.apple.com/search?term=${query}&entity=album&limit=20`;
      const searchRes = await fetch(searchUrl);
      const searchJson = await searchRes.json();

      // Filter results by artist name
      const results: iTunesSearchResult[] = searchJson.results || [];
      let matchingResults = results.filter(r => artistMatches(artist, r.artistName));

      // If no results or no matching artist, prompt user for manual ID
      if (results.length === 0 || matchingResults.length === 0) {
        if (results.length === 0) {
          console.log(`  No albums found for: ${artist} - ${album}`);
        } else {
          console.log(`  No matching artist found for: ${artist}`);
          console.log(`  iTunes returned: ${results.slice(0, 5).map(r => `${r.artistName} - ${r.collectionName}`).join(', ')}`);
        }

        // Offer manual ID entry or search with different terms
        const manualId = await promptForCollectionId();
        if (manualId) {
          // Recursively call with the manual ID
          return fetchFromiTunes(artist, album, manualId);
        }
        return null;
      }

      let selectedResult: iTunesSearchResult;

      // Check if there's an exact album name match
      const exactMatch = matchingResults.find(r =>
        normalizeString(r.collectionName) === normalizeString(album)
      );

      if (exactMatch) {
        // Exact match found, use it directly
        selectedResult = exactMatch;
        console.log(`  Found exact match: ${selectedResult.artistName} - ${selectedResult.collectionName} (ID: ${selectedResult.collectionId})`);
      } else {
        // No exact match, let user choose with option to search again
        let currentResults = matchingResults;
        let selectedId: number | 'search' | 'manual' = 'search';
        let manualId: number | null = null;

        while (selectedId === 'search' || selectedId === 'manual') {
          if (selectedId === 'manual') {
            manualId = await promptForCollectionId();
            if (manualId) {
              // Fetch the album directly by ID
              console.log(`\n  Looking up collection ID ${manualId}...`);
              const lookupUrl = `https://itunes.apple.com/lookup?id=${manualId}`;
              const lookupRes = await fetch(lookupUrl);
              const lookupJson = await lookupRes.json();

              if (lookupJson.resultCount > 0) {
                const result = lookupJson.results[0];
                currentResults = [{
                  collectionId: result.collectionId,
                  artistName: result.artistName,
                  collectionName: result.collectionName,
                  artworkUrl100: result.artworkUrl100,
                  collectionViewUrl: result.collectionViewUrl
                }];
                console.log(`  Found: ${result.artistName} - ${result.collectionName}`);
                selectedId = manualId;
              } else {
                console.log(`  Collection ID ${manualId} not found. Try again.`);
                selectedId = 'search';
              }
            } else {
              selectedId = 'search';
            }
            continue;
          }

          console.log(`  No exact match for album "${album}". Found ${currentResults.length} album(s):`);

          const options = currentResults.map(r => ({
            label: `${r.artistName} - ${r.collectionName} (ID: ${r.collectionId})`,
            value: r.collectionId
          }));

          selectedId = await promptUserSelection(
            options,
            `Select the correct album for "${artist} - ${album}":`
          );

          if (selectedId === 'search') {
            const searchTerms = await promptForSearchTerms();
            const newSearchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerms)}&entity=album&limit=25`;
            console.log(`\n  Searching iTunes for: "${searchTerms}"...`);
            const newSearchRes = await fetch(newSearchUrl);
            const newSearchJson = await newSearchRes.json();
            currentResults = newSearchJson.results || [];

            if (currentResults.length === 0) {
              console.log('  No results found. Try different search terms or enter ID manually.');
            }
          }
        }

        selectedResult = currentResults.find(r => r.collectionId === selectedId)!;
        console.log(`\n  Selected: ${selectedResult.artistName} - ${selectedResult.collectionName}`);
      }

      targetCollectionId = selectedResult.collectionId;
      albumMeta = {
        title: selectedResult.collectionName,
        artist: selectedResult.artistName,
        coverUrl: selectedResult.artworkUrl100.replace('100x100bb', '1000x1000bb'),
        collectionId: targetCollectionId,
        collectionViewUrl: selectedResult.collectionViewUrl?.replace(/music\.apple\.com\/[a-z]{2}\//, 'music.apple.com/').split('?')[0]
      };
    }

    // Fetch tracks for the album
    const tracksUrl = `https://itunes.apple.com/lookup?id=${targetCollectionId}&entity=song`;
    const tracksRes = await fetch(tracksUrl);
    const tracksJson = await tracksRes.json();

    // First result is the collection itself, rest are tracks
    const trackResults: iTunesTrackResult[] = tracksJson.results.filter(
      (item: iTunesTrackResult) => item.wrapperType === 'track'
    );

    // Map to Track interface with timeline (will be calculated in process-data.ts)
    const tracks: Track[] = trackResults
      .map((track: iTunesTrackResult) => ({
        title: track.trackName,
        durationMs: track.trackTimeMillis,
        trackNumber: track.trackNumber,
        trackId: track.trackId,
        previewUrl: track.previewUrl || null,
        startTime: 0, // Will be calculated in process-data.ts
        endTime: 0    // Will be calculated in process-data.ts
      }))
      .sort((a, b) => a.trackNumber - b.trackNumber);

    return {
      meta: albumMeta,
      tracks
    };

  } catch (error) {
    console.error('  Error fetching from iTunes:', error);
    return null;
  }
}

export async function fetchAlbumData(
  artist: string,
  album: string,
  collectionId?: number
): Promise<AlbumData | null> {
  const cache = loadCache();
  const cacheKey = getCacheKey(artist, album, collectionId);

  // Check cache - but only use cached data if it's not null
  // (null means previous fetch failed, we should retry and prompt user)
  const cached = cache[cacheKey];
  if (cached && cached.data && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`  Using cached data for: ${artist} - ${album}`);
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchFromiTunes(artist, album, collectionId);

  // Only cache successful results
  if (data) {
    cache[cacheKey] = {
      timestamp: Date.now(),
      data
    };
    saveCache(cache);
  }

  return data;
}

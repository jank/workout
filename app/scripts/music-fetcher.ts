import fs from 'fs';
import path from 'path';
import type { AlbumMeta, Track, AlbumData } from './lib/types';

const CACHE_DIR = path.join(__dirname, '../data/cache');
const CACHE_FILE = path.join(CACHE_DIR, 'itunes-cache.json');

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
}

interface iTunesTrackResult {
  wrapperType: string;
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
        collectionId: collectionId
      };
    } else {
      // Search and filter by artist
      const query = encodeURIComponent(`${artist} ${album}`);
      const searchUrl = `https://itunes.apple.com/search?term=${query}&entity=album&limit=10`;
      const searchRes = await fetch(searchUrl);
      const searchJson = await searchRes.json();

      if (searchJson.resultCount === 0) {
        console.error(`  Album not found: ${artist} - ${album}`);
        return null;
      }

      // Find best match by artist name
      const results: iTunesSearchResult[] = searchJson.results;
      const matchingResult = results.find(r => artistMatches(artist, r.artistName));

      if (!matchingResult) {
        console.error(`  No matching artist found for: ${artist}`);
        console.error(`  iTunes returned: ${results.map(r => r.artistName).join(', ')}`);
        return null;
      }

      targetCollectionId = matchingResult.collectionId;
      albumMeta = {
        title: matchingResult.collectionName,
        artist: matchingResult.artistName,
        coverUrl: matchingResult.artworkUrl100.replace('100x100bb', '1000x1000bb'),
        collectionId: targetCollectionId
      };

      console.log(`  Found album: ${albumMeta.artist} - ${albumMeta.title} (ID: ${targetCollectionId})`);
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

  // Check cache
  const cached = cache[cacheKey];
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`  Using cached data for: ${artist} - ${album}`);
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetchFromiTunes(artist, album, collectionId);

  // Update cache
  cache[cacheKey] = {
    timestamp: Date.now(),
    data
  };
  saveCache(cache);

  return data;
}

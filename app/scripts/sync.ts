import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { parseTcx } from './tcx-parser';
import { fetchAlbumData } from './music-fetcher';
import type { GeneratedWorkout, WorkoutRegistryEntry, Track } from './lib/types';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'https://log.concept2.com/api';
const TOKEN = process.env.CONCEPT2_ACCESS_TOKEN;
const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const REGISTRY_FILE = path.join(DATA_DIR, 'workouts.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/generated-workouts.json');

// Parse Arguments
const args = process.argv.slice(2);
const DEFAULT_MONTHS_BACK = 6;

let sinceDate: Date;
const sinceArg = args.find(arg => arg.startsWith('--since='));
const allArg = args.includes('--all');
const skipFetch = args.includes('--skip-fetch');

if (allArg) {
  sinceDate = new Date('2000-01-01');
} else if (sinceArg) {
  const dateStr = sinceArg.split('=')[1];
  sinceDate = new Date(dateStr);
  if (isNaN(sinceDate.getTime())) {
    console.error(`Invalid date format: ${dateStr}. Use ISO format like YYYY-MM-DD.`);
    process.exit(1);
  }
} else {
  sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - DEFAULT_MONTHS_BACK);
}

// Concept2 API types
interface C2Result {
  id: number;
  date: string;
  comments?: string;
}

interface C2Response {
  data: C2Result[];
  meta?: {
    pagination?: {
      total_pages: number;
    }
  }
}

// Helper functions
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
}

function loadRegistry(): WorkoutRegistryEntry[] {
  if (fs.existsSync(REGISTRY_FILE)) {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  }
  return [];
}

function saveRegistry(registry: WorkoutRegistryEntry[]) {
  registry.sort((a, b) => b.id.localeCompare(a.id)); // Newest first
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

function parseComment(comment: string): { artist: string; album: string } | null {
  const separators = [' - ', ' – ', ' — ', ': '];
  for (const sep of separators) {
    if (comment.includes(sep)) {
      const [artist, ...albumParts] = comment.split(sep);
      const album = albumParts.join(sep);
      if (artist.trim() && album.trim()) {
        return { artist: artist.trim(), album: album.trim() };
      }
    }
  }
  return null;
}

function generateWorkoutId(date: string, existingIds: Set<string>): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let id = `${year}-${month}-${day}-row`;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${year}-${month}-${day}-row-${suffix}`;
    suffix++;
  }
  return id;
}

async function fetchResults(page: number): Promise<C2Response> {
  const url = `${API_BASE}/users/me/results?page=${page}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${res.statusText}`);
  return await res.json() as C2Response;
}

async function downloadTcx(resultId: number, outputPath: string): Promise<void> {
  const url = `${API_BASE}/users/me/results/${resultId}/export/tcx`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  if (!res.ok) throw new Error(`Failed to download TCX: ${res.status}`);
  if (!res.body) throw new Error('No response body');
  const fileStream = fs.createWriteStream(outputPath);
  await finished(Readable.fromWeb(res.body as any).pipe(fileStream));
}

// Main sync function
async function main() {
  console.log('=== Workout Sync ===\n');
  ensureDirectories();

  const registry = loadRegistry();
  const existingTcxFiles = new Set(registry.map(e => e.tcxFile));
  const existingIds = new Set(registry.map(e => e.id));
  let registryUpdated = false;

  // Step 1: Fetch new workouts from Concept2
  if (!skipFetch && TOKEN) {
    console.log(`[1/3] Fetching workouts from Concept2 (since ${sinceDate.toISOString().split('T')[0]})...`);

    let currentPage = 1;
    let totalPages = 1;
    let stopFetching = false;
    let fetchedCount = 0;

    try {
      do {
        if (stopFetching) break;
        const response = await fetchResults(currentPage);
        const results = response.data;
        totalPages = response.meta?.pagination?.total_pages || 1;

        for (const workout of results) {
          const workoutDate = new Date(workout.date);
          if (workoutDate < sinceDate) {
            stopFetching = true;
            break;
          }

          if (!workout.comments?.trim()) continue;

          const filename = `concept2-workout-${workout.id}.tcx`;
          const filePath = path.join(RAW_DIR, filename);

          // Skip if already in registry
          if (existingTcxFiles.has(filename)) continue;

          const musicInfo = parseComment(workout.comments);
          if (!musicInfo) {
            console.log(`  Skipping ${workout.id}: comment "${workout.comments}" doesn't match "Artist - Album" format`);
            continue;
          }

          // Download TCX if not exists
          if (!fs.existsSync(filePath)) {
            console.log(`  Downloading ${workout.id} (${musicInfo.artist} - ${musicInfo.album})...`);
            try {
              await downloadTcx(workout.id, filePath);
              await new Promise(r => setTimeout(r, 500)); // Rate limit
            } catch (err: any) {
              console.error(`    Error: ${err.message}`);
              continue;
            }
          }

          // Add to registry
          const id = generateWorkoutId(workout.date, existingIds);
          existingIds.add(id);
          existingTcxFiles.add(filename);

          registry.push({
            id,
            tcxFile: filename,
            music: { artist: musicInfo.artist, album: musicInfo.album }
          });
          registryUpdated = true;
          fetchedCount++;
          console.log(`  Added: ${id}`);
        }

        currentPage++;
      } while (currentPage <= totalPages && !stopFetching);

      console.log(`  Fetched ${fetchedCount} new workout(s)\n`);
    } catch (error: any) {
      console.error(`  API error: ${error.message}\n`);
    }
  } else if (!TOKEN) {
    console.log('[1/3] Skipping fetch (no CONCEPT2_ACCESS_TOKEN in .env)\n');
  } else {
    console.log('[1/3] Skipping fetch (--skip-fetch)\n');
  }

  // Step 2: Resolve album data for all entries
  console.log('[2/3] Resolving album data...');

  for (const entry of registry) {
    // Skip if already has collection ID
    if (entry.music.itunesCollectionId) {
      console.log(`  ${entry.id}: Using saved collection ID ${entry.music.itunesCollectionId}`);
      continue;
    }

    console.log(`  ${entry.id}: Searching for "${entry.music.artist} - ${entry.music.album}"...`);
    const albumData = await fetchAlbumData(entry.music.artist, entry.music.album);

    if (albumData?.meta.collectionId) {
      entry.music.itunesCollectionId = albumData.meta.collectionId;
      registryUpdated = true;
      console.log(`    Saved collection ID: ${albumData.meta.collectionId}`);
    } else {
      console.log(`    Warning: Could not resolve album`);
    }
  }
  console.log('');

  // Save registry if updated
  if (registryUpdated) {
    saveRegistry(registry);
    console.log('  Updated workouts.json\n');
  }

  // Step 3: Generate output data
  console.log('[3/3] Generating workout data...');
  const enrichedWorkouts: GeneratedWorkout[] = [];

  for (const entry of registry) {
    const tcxPath = path.join(RAW_DIR, entry.tcxFile);
    if (!fs.existsSync(tcxPath)) {
      console.log(`  ${entry.id}: TCX file not found, skipping`);
      continue;
    }

    const workoutData = parseTcx(tcxPath);
    const albumData = await fetchAlbumData(
      entry.music.artist,
      entry.music.album,
      entry.music.itunesCollectionId
    );

    if (!albumData) {
      console.log(`  ${entry.id}: No album data, skipping`);
      continue;
    }

    // Map songs to timeline
    let currentOffset = 0;
    const tracksWithTimeline: Track[] = albumData.tracks.map(track => {
      const start = currentOffset;
      const end = currentOffset + (track.durationMs / 1000);
      currentOffset = end;
      return { ...track, startTime: start, endTime: end };
    });

    // Transform chart data
    const chartData = workoutData.trackPoints.map(p => {
      const pace = p.watts > 0 ? Math.pow(2.8 / p.watts, 1/3) * 500 : 0;
      return { t: p.timeOffsetSeconds, w: p.watts, hr: p.heartRate, p: pace };
    });

    // Calculate averages
    const validWatts = chartData.filter(d => d.w > 0);
    const validHR = chartData.filter(d => d.hr > 0);
    const validPace = chartData.filter(d => d.p > 0);

    const avgWatts = validWatts.length > 0
      ? validWatts.reduce((acc, curr) => acc + curr.w, 0) / validWatts.length : 0;
    const avgHeartRate = validHR.length > 0
      ? validHR.reduce((acc, curr) => acc + curr.hr, 0) / validHR.length : 0;
    const avgPace = validPace.length > 0
      ? validPace.reduce((acc, curr) => acc + curr.p, 0) / validPace.length : 0;

    enrichedWorkouts.push({
      id: entry.id,
      summary: {
        date: workoutData.startTime,
        totalDistance: workoutData.totalDistanceMeters,
        totalTime: workoutData.totalTimeSeconds,
        avgWatts: Math.round(avgWatts),
        avgPace: Math.round(avgPace * 10) / 10,
        avgHeartRate: Math.round(avgHeartRate)
      },
      charts: {
        time: chartData.map(d => d.t),
        watts: chartData.map(d => d.w),
        heartRate: chartData.map(d => d.hr),
        pace: chartData.map(d => d.p)
      },
      album: {
        meta: albumData.meta,
        tracks: tracksWithTimeline
      }
    });

    console.log(`  ${entry.id}: OK`);
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedWorkouts, null, 2));
  console.log(`\n=== Done! Generated ${enrichedWorkouts.length} workout(s) ===`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

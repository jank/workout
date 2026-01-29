import fs from 'fs';
import path from 'path';
import { parseTcx } from './tcx-parser';
import { fetchAlbumData } from './music-fetcher';
import type { GeneratedWorkout, WorkoutRegistryEntry, Track } from './lib/types';

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(__dirname, '../src/data/generated-workouts.json');

async function main() {
  const registryPath = path.join(DATA_DIR, 'workouts.json');
  const rawWorkouts: WorkoutRegistryEntry[] = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const enrichedWorkouts: GeneratedWorkout[] = [];

  console.log(`Processing ${rawWorkouts.length} workouts...`);

  for (const entry of rawWorkouts) {
    console.log(`\nProcessing: ${entry.id}`);

    // 1. Parse TCX
    const tcxPath = path.join(DATA_DIR, 'raw', entry.tcxFile);
    if (!fs.existsSync(tcxPath)) {
      console.error(`  TCX file not found: ${tcxPath}`);
      continue;
    }
    const workoutData = parseTcx(tcxPath);
    console.log(`  Parsed TCX: ${workoutData.totalDistanceMeters}m in ${workoutData.totalTimeSeconds}s`);

    // 2. Fetch Music (with optional collection ID override)
    console.log(`  Fetching Album: ${entry.music.artist} - ${entry.music.album}`);
    const albumData = await fetchAlbumData(
      entry.music.artist,
      entry.music.album,
      entry.music.itunesCollectionId
    );

    if (!albumData) {
      console.error("  Failed to fetch album data");
      continue;
    }

    // 3. Map Songs to Timeline
    let currentOffset = 0;
    const tracksWithTimeline: Track[] = albumData.tracks.map(track => {
      const start = currentOffset;
      const end = currentOffset + (track.durationMs / 1000);
      currentOffset = end;
      return {
        ...track,
        startTime: start,
        endTime: end
      };
    });

    // 4. Transform for Frontend
    // Concept2 formula: Watts = 2.80 / (pace^3). Pace = (2.80/Watts)^(1/3) * 500
    const chartData = workoutData.trackPoints.map(p => {
      const pace = p.watts > 0 ? Math.pow(2.8 / p.watts, 1/3) * 500 : 0;
      return {
        t: p.timeOffsetSeconds,
        w: p.watts,
        hr: p.heartRate,
        p: pace
      };
    });

    // Calculate averages
    const validWatts = chartData.filter(d => d.w > 0);
    const validHR = chartData.filter(d => d.hr > 0);
    const validPace = chartData.filter(d => d.p > 0);

    const avgWatts = validWatts.length > 0
      ? validWatts.reduce((acc, curr) => acc + curr.w, 0) / validWatts.length
      : 0;
    const avgHeartRate = validHR.length > 0
      ? validHR.reduce((acc, curr) => acc + curr.hr, 0) / validHR.length
      : 0;
    const avgPace = validPace.length > 0
      ? validPace.reduce((acc, curr) => acc + curr.p, 0) / validPace.length
      : 0;

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
  }

  // Ensure output dir exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedWorkouts, null, 2));
  console.log(`\nDone! Generated data for ${enrichedWorkouts.length} workouts.`);
}

main().catch(console.error);

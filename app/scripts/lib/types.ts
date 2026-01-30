// Shared type definitions for workout data pipeline

export interface TrackPoint {
  time: string;
  timeOffsetSeconds: number;
  distanceMeters: number;
  heartRate: number;
  watts: number;
  cadence: number;
}

export interface ParsedWorkout {
  id: string;
  startTime: string;
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  trackPoints: TrackPoint[];
}

export interface Track {
  title: string;
  durationMs: number;
  trackNumber: number;
  trackId: number;
  previewUrl: string | null;
  startTime: number;
  endTime: number;
}

export interface AlbumMeta {
  title: string;
  artist: string;
  coverUrl: string;
  collectionId?: number;
  collectionViewUrl?: string;
}

export interface AlbumData {
  meta: AlbumMeta;
  tracks: Track[];
}

export interface WorkoutSummary {
  date: string;
  totalDistance: number;
  totalTime: number;
  avgWatts: number;
  avgPace: number;
  avgHeartRate: number;
}

export interface WorkoutCharts {
  time: number[];
  watts: number[];
  heartRate: number[];
  pace: number[];
}

export interface GeneratedWorkout {
  id: string;
  summary: WorkoutSummary;
  charts: WorkoutCharts;
  album: AlbumData;
}

// Registry types (input data)
export interface MusicEntry {
  artist: string;
  album: string;
  itunesCollectionId?: number;
}

export interface WorkoutRegistryEntry {
  id: string;
  tcxFile: string;
  music: MusicEntry;
}

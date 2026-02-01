import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

export interface TrackPoint {
  time: string;
  timeOffsetSeconds: number;
  distanceMeters: number;
  heartRate: number;
  watts: number;
  cadence: number;
}

export interface WorkoutData {
  id: string;
  startTime: string;
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  trackPoints: TrackPoint[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

export function parseTcx(filePath: string): WorkoutData {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const result = parser.parse(xmlData);

  const activity = result.TrainingCenterDatabase.Activities.Activity;
  const lap = activity.Lap; // Assuming single lap for now, logic might need expansion for multi-lap
  const track = lap.Track;
  const trackpoints = Array.isArray(track.Trackpoint) ? track.Trackpoint : [track.Trackpoint];

  const startTime = new Date(activity.Id).getTime();
  
  const points: TrackPoint[] = trackpoints.map((tp: any) => {
    const currentTime = new Date(tp.Time).getTime();
    const timeOffsetSeconds = (currentTime - startTime) / 1000;

    // Handle nested extensions safely
    let watts = 0;
    if (tp.Extensions && tp.Extensions.TPX && tp.Extensions.TPX.Watts) {
      watts = parseInt(tp.Extensions.TPX.Watts);
    }

    // Handle Heart Rate safely
    let hr = 0;
    if (tp.HeartRateBpm && tp.HeartRateBpm.Value) {
      hr = parseInt(tp.HeartRateBpm.Value);
    }

    return {
      time: tp.Time,
      timeOffsetSeconds,
      distanceMeters: parseFloat(tp.DistanceMeters || 0),
      heartRate: hr,
      watts: watts,
      cadence: parseInt(tp.Cadence || 0)
    };
  });

  return {
    id: activity.Id,
    startTime: activity.Id,
    totalTimeSeconds: parseFloat(lap.TotalTimeSeconds),
    totalDistanceMeters: parseFloat(lap.DistanceMeters),
    trackPoints: points
  };
}

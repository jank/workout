"use client";

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';

interface ChartPoint {
  t: number;
  w: number;
  hr: number;
  p: number;
}

interface Track {
  title: string;
  startTime: number;
  endTime: number;
}

interface WorkoutChartProps {
  data: ChartPoint[];
  tracks: Track[];
}

type LeftAxisMetric = 'watts' | 'pace';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatPace = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function WorkoutChart({ data, tracks }: WorkoutChartProps) {
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [leftAxisMetric, setLeftAxisMetric] = useState<LeftAxisMetric>('watts');

  // Filter data to reduce point count for performance if needed
  const optimizedData = useMemo(() => {
    return data.filter((_, i) => i % 5 === 0);
  }, [data]);

  const leftAxisConfig = {
    watts: {
      dataKey: 'w',
      stroke: 'var(--neon-blue)',
      label: 'Watts',
      domain: undefined as [string, string] | undefined,
      tickFormatter: (v: number) => `${v}`,
      reversed: false
    },
    pace: {
      dataKey: 'p',
      stroke: 'var(--neon-purple)',
      label: 'Pace /500m',
      domain: undefined as [string, string] | undefined,
      tickFormatter: (v: number) => formatPace(v),
      reversed: true // Lower pace is better, so reverse axis
    }
  };

  const currentConfig = leftAxisConfig[leftAxisMetric];

  return (
    <div className="w-full h-[500px] flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-neutral-500 uppercase">Left Axis:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setLeftAxisMetric('watts')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              leftAxisMetric === 'watts'
                ? 'bg-[var(--neon-blue)] text-black font-semibold'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Watts
          </button>
          <button
            onClick={() => setLeftAxisMetric('pace')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              leftAxisMetric === 'pace'
                ? 'bg-[var(--neon-purple)] text-black font-semibold'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            Pace
          </button>
        </div>
      </div>

      {/* Music Timeline */}
      <div className="flex w-full h-12 gap-[1px] bg-neutral-900 rounded overflow-hidden">
        {tracks.map((track, i) => {
          const totalDuration = tracks[tracks.length - 1].endTime;
          const widthPct = ((track.endTime - track.startTime) / totalDuration) * 100;
          const isHovered = hoveredTrack?.title === track.title;

          return (
            <div
              key={i}
              className={`h-full relative group cursor-pointer transition-all duration-300 ${
                isHovered ? 'bg-[var(--neon-purple)]' : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
              style={{ width: `${widthPct}%` }}
              onMouseEnter={() => setHoveredTrack(track)}
              onMouseLeave={() => setHoveredTrack(null)}
            >
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                 <span className="text-[10px] whitespace-nowrap px-1 truncate text-neutral-400 group-hover:text-black">
                   {track.title}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Chart */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={optimizedData}>
            <defs>
              <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-blue)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--neon-blue)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatTime}
              stroke="#666"
              tick={{fontSize: 12}}
              minTickGap={60}
            />

            {/* Left Axis: Watts or Pace */}
            <YAxis
              yAxisId="left"
              stroke={currentConfig.stroke}
              label={{ value: currentConfig.label, angle: -90, position: 'insideLeft', fill: '#666' }}
              domain={currentConfig.domain}
              tickFormatter={currentConfig.tickFormatter}
              reversed={currentConfig.reversed}
            />

            {/* Right Axis: HR */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--neon-red)"
              domain={['dataMin - 10', 'dataMax + 10']}
              label={{ value: 'HR', angle: 90, position: 'insideRight', fill: '#666' }}
            />

            <Tooltip
              contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
              labelFormatter={(label) => formatTime(label as number)}
              formatter={(value, name) => {
                const v = value as number;
                if (name === 'p') return [formatPace(v), 'Pace'];
                if (name === 'w') return [`${v}W`, 'Watts'];
                if (name === 'hr') return [`${v} bpm`, 'HR'];
                return [v, name];
              }}
            />

            {/* Song Highlight Area */}
            {hoveredTrack && (
              <ReferenceArea
                yAxisId="left"
                x1={hoveredTrack.startTime}
                x2={hoveredTrack.endTime}
                strokeOpacity={0.3}
                fill="var(--neon-purple)"
                fillOpacity={0.1}
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey={currentConfig.dataKey}
              stroke={currentConfig.stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="hr"
              stroke="var(--neon-red)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

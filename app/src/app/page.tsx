import workouts from '@/data/generated-workouts.json';
import WorkoutCard from '@/components/WorkoutCard';

export default function Home() {
  return (
    <main className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">
          WORKOUT <span className="text-[var(--neon-blue)]">LOG</span>
        </h1>
        <p className="text-neutral-400 text-lg">
          Syncing physical effort with auditory rhythm.
        </p>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            id={workout.id}
            date={workout.summary.date}
            distance={workout.summary.totalDistance}
            time={workout.summary.totalTime}
            albumCover={workout.album.meta.coverUrl}
            artist={workout.album.meta.artist}
            album={workout.album.meta.title}
          />
        ))}
      </div>
    </main>
  );
}

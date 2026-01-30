# Workout Tracker

A Next.js app that syncs rowing workouts from Concept2 with the albums played during each session, visualizing performance metrics alongside the music timeline.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` with your Concept2 API token:
   ```
   CONCEPT2_ACCESS_TOKEN=<your-token-from-log.concept2.com/settings>
   ```

## Usage

### Sync workouts from Concept2
```bash
npm run sync                    # Fetch last 6 months
npm run sync -- --since=2025-01-01  # Fetch since specific date
npm run sync -- --all           # Fetch all history
npm run sync -- --skip-fetch    # Regenerate data from local TCX files only
```

The sync script:
1. Fetches workouts with comments in "Artist - Album" format
2. Downloads TCX files from Concept2 API
3. Resolves album metadata from iTunes (interactive prompts for ambiguous matches)
4. Generates `src/data/generated-workouts.json`

### Development
```bash
npm run dev   # Runs sync (skip-fetch) then starts Next.js dev server
```

### Production build
```bash
npm run build   # Runs prebuild (sync --skip-fetch) then next build
```

Output is a static export in `out/` - deploy to any static host.

## Data files

- `data/workouts.json` - Registry of synced workouts with iTunes collection IDs
- `data/raw/*.tcx` - Downloaded TCX files from Concept2
- `data/cache/itunes-cache.json` - iTunes API response cache (7-day TTL)
- `src/data/generated-workouts.json` - Build artifact (gitignored)

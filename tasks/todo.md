# Goal Tracking & Post-Goal Time Wasting Report

## Tasks
- [x] 1. Add `goals: []` to matchInfo default state and reset handler
- [x] 2. Add goal buttons UI in match bar (below added time row)
- [x] 3. Compute goal-wasting data (helper to calculate wasted time after each goal)
- [x] 4. Add goal timeline section in share card
- [x] 5. Update getSummaryText and getTweetText with goal info
- [x] 6. Build and verify

## Review

### Changes made (all in `src/App.jsx`)

**1. matchInfo state (line 23 + reset handler)**
- Added `goals: []` to the default matchInfo object in both initial state and reset handler.

**2. Match bar goal buttons (below added time stepper)**
- Added a row with two goal buttons: green "⚽ HOME" and red "⚽ AWAY"
- Live score displayed between buttons (e.g. "1 - 0")
- Each tap logs a goal with team, match minute (from clock), half, and timestamp
- Small "✕" undo button to remove the last logged goal

**3. Goal-wasting computation (after catNotWasting)**
- `goalTimeline` array computed from `matchInfo.goals`
- For each goal: calculates running score, team name, display minute
- Computes time wasted by the scoring team between that goal and the next (using matchMinute when available, falls back to event.id/time ordering)

**4. Share card goal timeline section**
- New "GOALS & TIME WASTING" block between added time and category breakdown
- Each goal shows: ⚽ TeamName ScoreLine (minute') — MM:SS wasted after
- Color-coded by team (green for home, red for away)
- Only renders when goals exist

**5. Social text exports**
- `getSummaryText()`: Adds "⚽ GOALS:" section with one line per goal including wasted time
- `getTweetText()`: Adds compact goal lines with wasted time

**6. Persistence**
- No extra work — goals array is part of matchInfo which already persists to localStorage and saves to history on reset

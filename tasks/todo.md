# Additional Time (Stoppage Time) Feature

## Tasks
- [x] 1. Add `addedTime1` and `addedTime2` to matchInfo default state and reset handler
- [x] 2. Add stepper UI next to half buttons in match bar
- [x] 3. Update share card to show added time comparison per half
- [x] 4. Update `getSummaryText()` and `getTweetText()` to include added time info
- [x] 5. Build and verify no errors

## Review

### Changes made (all in `src/App.jsx`)

**1. matchInfo state (line 23 + line 534)**
- Added `addedTime1: 0` and `addedTime2: 0` to the default matchInfo object in both the initial state and reset handler.

**2. Match bar stepper UI (line 314 area)**
- Added a second row in the match bar that appears when viewing "1st Half" or "2nd Half"
- Shows "Added time: −  +X min  +" with minus/plus buttons to adjust
- Orange colored value display, minimal footprint

**3. Share card added time comparison (line 469 area)**
- In the per-half stats boxes, each half now shows "+X min" next to the half name and a percentage line ("X% of added time wasted") when added time > 0
- For single-half view, added a summary bar showing total added time and wasted percentage

**4. Social text exports**
- `getSummaryText()`: Half stats line now includes "| +X min added (Y%)" when added time is set
- `getTweetText()`: Adds a line showing per-half added time breakdown when set

**5. Persistence**
- No extra work needed — matchInfo already persists to localStorage and saves to history on reset, so addedTime1/addedTime2 come along automatically

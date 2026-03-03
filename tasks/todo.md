# Task: Add 3 features before kickoff

## Todo
- [x] #1 Which team is wasting — toggle between home/away on each event
- [x] #2 Quick half switch — tap to change half without opening edit form
- [x] #3 Undo last action — button to remove the last logged event

## Review

### #1 Which team is wasting
- Added team selector bar (HOME | AWAY) at top of tracker view, green for home, red for away
- Each logged event now stores `team`, `teamName`, and `half`
- Log view shows team name on each event
- Share card shows per-team wasting time breakdown
- Social media text includes per-team stats

### #2 Quick half switch
- Replaced half text in match bar with 3 tappable buttons: 1st Half | 2nd Half | ET
- Active half is highlighted green, one tap to switch
- Removed half dropdown from edit form (no longer needed there)

### #3 Undo last action
- Added "↩ Undo" button next to the hint text in tracker view
- Only shows when there are events to undo
- Removes the most recently logged event

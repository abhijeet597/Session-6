---
name: habit-report-generator
description: Generates a weekly Markdown summary report of habit streaks, completion rates by category, and habits at risk of breaking a streak. Invoke with /habit-report-generator or ask for a weekly habit summary/report.
user-invocable: true
---

# habit-report-generator

Produce a weekly habit summary report in Markdown format using live data from the API.

## Data source

Call `GET /api/habits` to retrieve all habits for the current user. Each habit has:
- `_id`, `name`, `category`, `frequency` (Daily/Weekly/Monthly)
- `completedDates` — array of `"YYYY-MM-DD"` strings
- `createdDate` — `"YYYY-MM-DD"` string

If a `/api/habits/trend` endpoint is available, prefer it — it returns pre-aggregated streak and completion data. Fall back to `/api/habits` and compute the metrics below yourself.

## Metrics to compute

**Current streak** (per habit):
- Daily: consecutive days ending today (or yesterday if today has no check-in yet) where `completedDates` contains that date.
- Weekly: consecutive ISO weeks ending this week where at least one check-in exists.
- Monthly: consecutive calendar months ending this month where at least one check-in exists.

**Completion rate by category** (last 7 days):
- For each category, count how many expected check-ins occurred vs. how many habits in that category are Daily (7 expected), Weekly (1 expected), or Monthly (0 or 1 expected).
- Express as a percentage, rounded to the nearest whole number.

**At-risk habits**:
- A habit is "at risk" if its current streak is ≥ 3 AND it has not checked in today (for Daily habits) or this week (for Weekly habits).

## Report format

Use the bundled `sample-output.md` as the canonical format reference. Key structure:

```
# Weekly Habit Report — [week range, e.g. "Sep 18 – Sep 24, 2026"]

## Streak Leaderboard
| Habit | Category | Frequency | Current Streak |
| ...

## Completion Rates by Category
| Category | Completion Rate (last 7 days) |
| ...

## ⚠ At-Risk Habits
| Habit | Streak | Last Check-in |
| ...

_Generated [date] · [N] habits tracked_
```

## Instructions

1. Fetch data from the API (use `Bash` with `curl` or `node -e` to call the running server at `http://localhost:3001`).
2. Compute the three metric sets above.
3. Output the full Markdown report to the terminal — do not write it to a file unless the user asks.
4. If the server is not running, say so clearly and ask the user to start it with `cd backend && npm start`.

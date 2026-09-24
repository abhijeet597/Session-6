---
name: streak-recovery-suggester
description: Given a habit whose streak just broke, suggests a specific small re-entry action to get back on track. Triggers automatically when a user mentions a broken streak, a missed habit, or asks what to do after missing a day.
user-invocable: true
---

# streak-recovery-suggester

When a user's habit streak has just broken, give one specific, actionable re-entry suggestion — not encouragement, not a lecture, not a list of options. One concrete next step.

## What to produce

A short response (3–5 sentences max) containing:

1. **Acknowledge the break in one clause** — name the habit and the streak length. No dwelling.
2. **One specific re-entry action** — scaled down from the full habit. The action must be:
   - Concrete (not "try again tomorrow" — say exactly what to do)
   - Smaller than the original habit (lower the bar to restart momentum)
   - Tied to a specific time or trigger today or tomorrow
3. **One sentence on why smaller is correct** — consistency after a break matters more than intensity.

## Rules

- Never give generic pep talk ("You've got this!", "Don't give up!").
- Never suggest the user "reset" their streak counter — broken streaks are not resets to zero.
- Never list multiple options — one suggestion only.
- If the habit name and streak length are known, use them. If not, ask for them before responding.
- Scale the re-entry action to the habit type:
  - Exercise habits → shorter duration or lower intensity version (e.g. 10-min walk instead of 30-min run)
  - Reading/learning habits → one page, one video, or 5 minutes instead of the full session
  - Mindfulness/journaling → one sentence or one breath cycle instead of the full practice
  - Nutrition habits → one meal compliance instead of full-day compliance
  - Any other habit → half the normal effort or half the normal time

## Example

User: "My 12-day Morning run streak just broke."

Response: "12 days is real progress — one missed day doesn't erase it. Tomorrow morning, do a 10-minute walk at your normal run time instead of the full run; same trigger, lower bar. One short session is all it takes to re-establish the habit signal before the full routine comes back."

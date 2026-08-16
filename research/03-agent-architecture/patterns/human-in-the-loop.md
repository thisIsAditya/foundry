# Pattern: human-in-the-loop

Copy CoFounderBot / LaunchPad:

- Policy table: `action_type → auto | approve | forbid`  
- `pending_actions` queue  
- Founder override is logged on the pack  

Default forbid: government submit, unsupervised sales calls, children’s data processing, bulk scrape.

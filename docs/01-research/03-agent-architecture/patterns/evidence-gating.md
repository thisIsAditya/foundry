# Pattern: evidence gating

Gates A/B/C are **functions** over the pack, not LLM opinions.

```
gate_A = count(interviews where pain_repeatable and not_friend) >= N
         AND quotes >= Q
gate_B = exists(wtp_event where not_friend AND (amount > 0 OR loi))
gate_C = metrics.hit_pre_registered_bar AND paying_strangers >= K
```

LLM may **recommend** a waiver; the UI must show it as a waiver.

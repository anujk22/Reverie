# Reverie Evals

Run date: 2026-07-06 22:36:36 EDT

Headline: +0.8 personalization vs no memory with 72% fewer reply-context tokens than full history

## Personalization

| Condition | Session | Score |
| --- | ---: | ---: |
| no_memory | 2 | 2.0 |
| no_memory | 3 | 2.0 |
| full_history | 2 | 3.667 |
| full_history | 3 | 3.667 |
| reverie | 2 | 3.0 |
| reverie | 3 | 2.667 |

## Recall Precision

| Session | Precision |
| ---: | ---: |
| 2 | 1.0 |
| 3 | 1.0 |

## Reply tokens (assistant call context + response, per session)

Counts only the assistant reply calls — the context each condition
feeds the reply model. Observer/dream/embedding overhead is listed
under pipeline totals below; eval-judge calls are excluded everywhere
(they are the measuring instrument, not the system under test).

| Condition | Session | Tokens |
| --- | ---: | ---: |
| no_memory | 1 | 2349 |
| no_memory | 2 | 2345 |
| no_memory | 3 | 2361 |
| full_history | 1 | 2394 |
| full_history | 2 | 11039 |
| full_history | 3 | 21451 |
| reverie | 1 | 2384 |
| reverie | 2 | 3454 |
| reverie | 3 | 3957 |

## Pipeline totals across all conditions (by call purpose)

| Purpose | Tokens |
| --- | ---: |
| consolidate | 16157 |
| embed | 1104 |
| eval_judge | 18299 |
| judge | 580 |
| observer | 16154 |
| tutor | 51734 |

Forgetting check: pass.

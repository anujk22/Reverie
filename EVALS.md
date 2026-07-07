# Reverie Evals

Run date: 2026-07-07 13:46:00 EDT

Headline: +3.7 personalization vs no memory with 68% fewer reply-context tokens than full history

## Personalization

| Condition | Session | Score |
| --- | ---: | ---: |
| no_memory | 2 | 1.0 |
| no_memory | 3 | 1.0 |
| full_history | 2 | 4.0 |
| full_history | 3 | 1.0 |
| reverie | 2 | 5.0 |
| reverie | 3 | 4.333 |

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
| no_memory | 1 | 2458 |
| no_memory | 2 | 2483 |
| no_memory | 3 | 2330 |
| full_history | 1 | 2493 |
| full_history | 2 | 10827 |
| full_history | 3 | 19444 |
| reverie | 1 | 2498 |
| reverie | 2 | 3790 |
| reverie | 3 | 4310 |

## Pipeline totals across all conditions (by call purpose)

| Purpose | Tokens |
| --- | ---: |
| consolidate | 15855 |
| embed | 1131 |
| eval_judge | 15271 |
| judge | 1158 |
| observer | 13581 |
| tutor | 50633 |

Forgetting check: pass.

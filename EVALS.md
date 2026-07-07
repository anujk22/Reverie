# Reverie Evals

Run date: 2026-07-07 12:22:40 EDT

Headline: +0.5 personalization vs no memory with 71% fewer reply-context tokens than full history

## Personalization

| Condition | Session | Score |
| --- | ---: | ---: |
| no_memory | 2 | 5.0 |
| no_memory | 3 | 4.0 |
| full_history | 2 | 4.333 |
| full_history | 3 | 5.0 |
| reverie | 2 | 5.0 |
| reverie | 3 | 5.0 |

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
| no_memory | 1 | 2920 |
| no_memory | 2 | 2907 |
| no_memory | 3 | 2916 |
| full_history | 1 | 2989 |
| full_history | 2 | 13004 |
| full_history | 3 | 22348 |
| reverie | 1 | 2929 |
| reverie | 2 | 3626 |
| reverie | 3 | 4394 |

## Pipeline totals across all conditions (by call purpose)

| Purpose | Tokens |
| --- | ---: |
| consolidate | 13885 |
| embed | 1107 |
| eval_judge | 18344 |
| judge | 588 |
| observer | 15919 |
| tutor | 58033 |

Forgetting check: pass.

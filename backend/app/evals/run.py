from __future__ import annotations

import asyncio
import json

from app.evals.runner import run_eval_suite


async def main() -> None:
    print("Estimated live token budget: 150,000-250,000 tokens.")
    results = await run_eval_suite()
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

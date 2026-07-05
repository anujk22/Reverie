from __future__ import annotations

from fastapi import APIRouter

from app.evals.runner import latest_results, run_eval_suite, run_smoke_eval


router = APIRouter(prefix="/api/evals", tags=["evals"])


@router.post("/run")
async def run():
    return run_eval_suite()


@router.get("/results")
async def results():
    return latest_results()


@router.post("/smoke")
async def smoke():
    return await run_smoke_eval()

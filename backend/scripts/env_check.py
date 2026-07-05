#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
import time
from typing import Any


DASHSCOPE_ENDPOINTS = (
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
)
CHAT_FALLBACK_MODELS = ("qwen-plus", "qwen-max", "qwen-turbo")
EMBEDDING_FALLBACK_MODELS = ("text-embedding-v4", "text-embedding-v3")
RATE_LIMIT_MARKERS = ("ratelimit", "rate-limit")


def load_dotenv_if_available() -> None:
    try:
        from dotenv import load_dotenv
    except Exception:
        return
    load_dotenv()


def unique(values: list[str] | tuple[str, ...]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = value.strip()
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def unique_endpoints(values: list[str] | tuple[str, ...]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        endpoint = value.strip().rstrip("/")
        if endpoint and endpoint not in seen:
            seen.add(endpoint)
            result.append(endpoint)
    return result


def redact(value: Any, secret: str) -> str:
    text = str(value)
    if secret:
        text = text.replace(secret, "[REDACTED]")
    return text


def short_error(exc: Exception, secret: str) -> str:
    return redact(exc, secret).replace("\n", " ")[:500]


def parse_raw_response(raw_response: Any) -> Any:
    parse = getattr(raw_response, "parse", None)
    return parse() if parse else raw_response


def rate_limit_headers(raw_response: Any) -> dict[str, str]:
    headers = getattr(raw_response, "headers", {}) or {}
    visible: dict[str, str] = {}
    for name, value in headers.items():
        lower = name.lower()
        if any(marker in lower for marker in RATE_LIMIT_MARKERS):
            visible[name] = str(value)
    return visible


def print_rate_limit_headers(raw_response: Any, indent: str = "    ") -> None:
    headers = rate_limit_headers(raw_response)
    if not headers:
        return
    print(f"{indent}rate-limit headers:")
    for name, value in sorted(headers.items()):
        print(f"{indent}  {name}: {value}")


def print_error_rate_limit_headers(exc: Exception, indent: str = "    ") -> None:
    response = getattr(exc, "response", None)
    if response is not None:
        print_rate_limit_headers(response, indent)


def model_id(model: Any) -> str:
    if isinstance(model, dict):
        return str(model.get("id", ""))
    return str(getattr(model, "id", ""))


def list_models(client: Any, secret: str) -> list[str]:
    try:
        raw_response = client.models.with_raw_response.list()
        response = parse_raw_response(raw_response)
        models = sorted(
            model
            for model in {model_id(item) for item in getattr(response, "data", [])}
            if model
        )
    except Exception as exc:
        print(f"  models.list: failed ({short_error(exc, secret)})")
        print_error_rate_limit_headers(exc, indent="    ")
        return []

    print(f"  models.list: ok ({len(models)} models)")
    for model in models:
        print(f"    - {model}")
    print_rate_limit_headers(raw_response, indent="    ")
    return models


def qwen3_instruct_models(models: list[str]) -> list[str]:
    blocked_markers = ("embedding", "rerank", "-vl", "vl-", "vision", "omni")
    candidates = [
        model
        for model in models
        if "qwen3" in model.lower()
        and not any(marker in model.lower() for marker in blocked_markers)
    ]
    explicit_instruct = [
        model for model in candidates if "instruct" in model.lower()
    ]
    return explicit_instruct or candidates


def vl_models(models: list[str]) -> list[str]:
    markers = ("-vl", "vl-", "qwen-vl", "vision", "visual", "omni", "qvq")
    return [
        model
        for model in models
        if any(marker in model.lower() for marker in markers)
    ]


def print_vl_inventory(models: list[str]) -> None:
    detected = vl_models(models)
    if not models:
        print("  VL models: unknown (model list unavailable)")
        return
    if not detected:
        print("  VL models: none detected in model list")
        return
    print(f"  VL models: detected ({len(detected)})")
    for model in detected:
        print(f"    - {model}")


def test_chat(client: Any, models: list[str], secret: str) -> dict[str, Any] | None:
    print("  chat fallback:")
    for model in models:
        try:
            started = time.perf_counter()
            raw_response = client.chat.completions.with_raw_response.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": "Reply with exactly: reverie-ok",
                    }
                ],
                max_tokens=16,
                temperature=0,
            )
            response = parse_raw_response(raw_response)
            text = response.choices[0].message.content or ""
            latency_ms = int((time.perf_counter() - started) * 1000)
        except Exception as exc:
            print(f"    {model}: failed ({short_error(exc, secret)})")
            print_error_rate_limit_headers(exc, indent="      ")
            continue

        print(f"    {model}: ok ({latency_ms} ms, {text.strip()[:80]})")
        print_rate_limit_headers(raw_response, indent="      ")
        return {"model": model, "latency_ms": latency_ms}
    return None


def test_embeddings(
    client: Any, models: list[str], secret: str
) -> dict[str, Any] | None:
    print("  embeddings:")
    for model in models:
        try:
            started = time.perf_counter()
            raw_response = client.embeddings.with_raw_response.create(
                model=model,
                input="Reverie environment check embedding probe.",
            )
            response = parse_raw_response(raw_response)
            embedding = response.data[0].embedding
            latency_ms = int((time.perf_counter() - started) * 1000)
        except Exception as exc:
            print(f"    {model}: failed ({short_error(exc, secret)})")
            print_error_rate_limit_headers(exc, indent="      ")
            continue

        dimension = len(embedding)
        print(f"    {model}: ok ({latency_ms} ms, dimension {dimension})")
        print_rate_limit_headers(raw_response, indent="      ")
        return {"model": model, "dimension": dimension, "latency_ms": latency_ms}
    return None


def endpoint_report(endpoint: str, api_key: str, OpenAI: Any) -> dict[str, Any]:
    print(f"\nEndpoint: {endpoint}")
    client = OpenAI(api_key=api_key, base_url=endpoint, timeout=30, max_retries=0)

    models = list_models(client, api_key)
    print_vl_inventory(models)

    qwen3_models = qwen3_instruct_models(models)
    if qwen3_models:
        print("  qwen3 instruct fallback candidates:")
        for model in qwen3_models:
            print(f"    - {model}")
    else:
        print("  qwen3 instruct fallback candidates: none discovered")

    chat_model = test_chat(
        client,
        unique(list(CHAT_FALLBACK_MODELS) + qwen3_models),
        api_key,
    )
    embedding_result = test_embeddings(
        client,
        unique(
            [
                os.getenv("EMBED_MODEL", ""),
                *EMBEDDING_FALLBACK_MODELS,
            ]
        ),
        api_key,
    )

    return {
        "endpoint": endpoint,
        "models": models,
        "chat_model": chat_model["model"] if chat_model else None,
        "chat_latency_ms": chat_model["latency_ms"] if chat_model else None,
        "embedding_model": embedding_result["model"] if embedding_result else None,
        "embedding_dimension": embedding_result["dimension"] if embedding_result else None,
        "embedding_latency_ms": embedding_result["latency_ms"] if embedding_result else None,
    }


def main() -> int:
    load_dotenv_if_available()

    api_key = os.getenv("DASHSCOPE_API_KEY", "")
    print("Reverie DashScope environment check")
    print(f"DASHSCOPE_API_KEY: {'present (redacted)' if api_key else 'missing'}")

    if not api_key:
        print("Live DashScope probes skipped because DASHSCOPE_API_KEY is not set.")
        return 0

    try:
        from openai import OpenAI
    except Exception as exc:
        print(f"openai package unavailable: {short_error(exc, api_key)}")
        return 1

    configured_endpoint = os.getenv("DASHSCOPE_BASE_URL", "")
    endpoints = unique_endpoints([configured_endpoint, *DASHSCOPE_ENDPOINTS])
    results = [endpoint_report(endpoint, api_key, OpenAI) for endpoint in endpoints]

    print("\nSummary:")
    for result in results:
        dimension = result["embedding_dimension"]
        embedding = result["embedding_model"]
        embedding_text = f"{embedding} ({dimension} dims)" if embedding else "failed"
        print(
            "  "
            + result["endpoint"]
            + f": chat={result['chat_model'] or 'failed'}"
            + (
                f" ({result['chat_latency_ms']} ms)"
                if result["chat_latency_ms"] is not None
                else ""
            )
            + f", embedding={embedding_text}"
            + (
                f" ({result['embedding_latency_ms']} ms)"
                if result["embedding_latency_ms"] is not None
                else ""
            )
        )

    usable = any(
        result["chat_model"] and result["embedding_model"] for result in results
    )
    return 0 if usable else 1


if __name__ == "__main__":
    sys.exit(main())

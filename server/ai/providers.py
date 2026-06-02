"""
AI provider factory.

build_provider() is called once in the lifespan hook and stored on
app.state.provider. AI_PROVIDER=auto preserves the historical Ollama-first,
Gemini-fallback behavior; AI_PROVIDER=bedrock opts into Amazon Bedrock.
"""

from config import get_settings
from ai.base import AIProvider


def _log_provider_usage(scope: str, provider: AIProvider) -> None:
    getter = getattr(provider, "get_last_metadata", None)
    if not callable(getter):
        return
    try:
        metadata = getter()
    except Exception:
        return
    if not isinstance(metadata, dict) or not metadata:
        return
    print(
        "[AI_USAGE] "
        f"scope={scope} provider={metadata.get('provider') or type(provider).__name__} "
        f"model={metadata.get('model') or getattr(provider, 'model', 'unknown')} "
        f"prompt_tokens={metadata.get('prompt_tokens') or metadata.get('input_tokens')} "
        f"completion_tokens={metadata.get('completion_tokens') or metadata.get('output_tokens')} "
        f"total_tokens={metadata.get('total_tokens')} latency_ms={metadata.get('latency_ms')} "
        f"response_time={metadata.get('response_time')}"
    )


async def build_provider() -> AIProvider:
    cfg = get_settings()
    selected = cfg.ai_provider_normalized

    if selected == "bedrock":
        from ai.bedrock import BedrockProvider
        provider = BedrockProvider()
        if await provider.check_connection():
            print(f"[PROVIDER] Bedrock active ({cfg.bedrock_model_id})")
            return provider
        raise RuntimeError("AI_PROVIDER=bedrock selected, but Bedrock runtime is unavailable")

    if selected == "gemini":
        if cfg.google_generative_ai_api_key:
            from ai.gemini import GeminiProvider
            provider = GeminiProvider()
            print(f"[PROVIDER] Gemini active ({cfg.gemini_model})")
            return provider
        raise RuntimeError("AI_PROVIDER=gemini selected, but GOOGLE_GENERATIVE_AI_API_KEY is not set")

    if selected in {"auto", "ollama"} and not cfg.disable_ollama:
        from ai.ollama import OllamaTutor
        tutor = OllamaTutor()
        if await tutor.check_connection():
            print(f"[PROVIDER] Ollama active ({cfg.ollama_model})")
            return tutor
        if selected == "ollama":
            raise RuntimeError("AI_PROVIDER=ollama selected, but Ollama is not reachable")
        print("[PROVIDER] Ollama not reachable; trying Gemini fallback")

    if selected == "auto" and cfg.google_generative_ai_api_key:
        from ai.gemini import GeminiProvider
        provider = GeminiProvider()
        print(f"[PROVIDER] Gemini active ({cfg.gemini_model})")
        return provider

    raise RuntimeError(
        "No AI provider available. Set AI_PROVIDER=bedrock with AWS credentials, "
        "start Ollama, or set GOOGLE_GENERATIVE_AI_API_KEY."
    )


async def generate_once(prompt: str, system: str = "") -> str:
    """
    One-shot generation that re-evaluates provider availability each call.
    Suitable for background tasks and endpoints that run outside the normal
    app.state lifecycle.
    """
    cfg = get_settings()
    selected = cfg.ai_provider_normalized

    if selected == "bedrock":
        from ai.bedrock import BedrockProvider
        provider = BedrockProvider()
        response = await provider.generate(prompt, system=system)
        _log_provider_usage("generate_once", provider)
        return response

    if selected == "gemini":
        if cfg.google_generative_ai_api_key:
            from ai.gemini import GeminiProvider
            provider = GeminiProvider()
            response = await provider.generate(prompt, system=system)
            _log_provider_usage("generate_once", provider)
            return response
        raise RuntimeError("AI_PROVIDER=gemini selected, but GOOGLE_GENERATIVE_AI_API_KEY is not set")

    if selected in {"auto", "ollama"} and not cfg.disable_ollama:
        from ai.ollama import check_ollama_connection
        if check_ollama_connection():
            from ai.ollama import OllamaTutor
            tutor = OllamaTutor()
            response = await tutor.generate(prompt, system=system)
            _log_provider_usage("generate_once", tutor)
            return response
        if selected == "ollama":
            raise RuntimeError("AI_PROVIDER=ollama selected, but Ollama is not reachable")

    if selected == "auto" and cfg.google_generative_ai_api_key:
        from ai.gemini import GeminiProvider
        provider = GeminiProvider()
        response = await provider.generate(prompt, system=system)
        _log_provider_usage("generate_once", provider)
        return response

    raise RuntimeError("No AI provider available for one-shot generation.")

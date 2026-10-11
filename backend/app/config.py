"""Application settings (pydantic-settings). No secrets are hardcoded."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3-flash-preview"
    GEMINI_FALLBACK_MODELS: str = "gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.8-flash"
    ZEN_API_KEY: str = ""
    ZEN_MODEL: str = "mimo-v2.5-free"
    ZEN_BASE_URL: str = "https://opencode.ai/zen/v1"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173"
    REQUEST_TIMEOUT_SECONDS: float = 60.0
    RATE_LIMIT_MAX: int = 10
    RATE_LIMIT_WINDOW_SECONDS: int = 600

    def allowed_origins_list(self) -> list[str]:
        seen: list[str] = []
        for part in (self.ALLOWED_ORIGINS or "").split(","):
            origin = part.strip()
            if origin and origin not in seen:
                seen.append(origin)
        # Always allow the Vite dev server even if env omits it.
        for fallback in (
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://0.0.0.0:5173",
            "http://[::1]:5173",
        ):
            if fallback not in seen:
                seen.append(fallback)
        return seen


    def gemini_model_candidates(self) -> list[str]:
        models = [self.GEMINI_MODEL.strip()] if self.GEMINI_MODEL and self.GEMINI_MODEL.strip() else []
        for m in (self.GEMINI_FALLBACK_MODELS or "").split(","):
            cleaned = m.strip()
            if cleaned and cleaned not in models:
                models.append(cleaned)
        return models or ["gemini-3-flash-preview"]


settings = Settings()

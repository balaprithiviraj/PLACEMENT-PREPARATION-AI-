"""Pydantic request/response contracts for the AI question generator."""

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator

Track = Literal["technical", "aptitude"]
Difficulty = Literal["Easy", "Medium", "Hard", "Mixed"]


class GenerateQuestionsRequest(BaseModel):
    track: Track
    topic: str = Field(min_length=2, max_length=120)
    difficulty: Difficulty
    count: int = Field(ge=1, le=15)

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("topic must be at least 2 characters")
        return cleaned


class GeneratedQuestion(BaseModel):
    question: str = Field(min_length=1)
    options: List[str] = Field(min_length=4, max_length=4)
    correctAnswer: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1)

    @field_validator("question", "explanation")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("must not be blank")
        return value.strip()

    @field_validator("options")
    @classmethod
    def options_must_be_four_unique_non_empty(cls, value: List[str]) -> List[str]:
        cleaned = [(item.strip() if isinstance(item, str) else "") for item in value]
        if len(cleaned) != 4 or any(not item for item in cleaned):
            raise ValueError("options must contain four unique non-empty strings")
        if len(set(cleaned)) != 4:
            raise ValueError("options must contain four unique non-empty strings")
        return cleaned


class QuestionsData(BaseModel):
    questions: List[GeneratedQuestion]


class GenerateQuestionsResponse(BaseModel):
    data: QuestionsData

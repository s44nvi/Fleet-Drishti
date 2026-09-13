from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class Detection:
    class_name: str
    confidence: float
    bbox: tuple[float, float, float, float]


class Detector(ABC):
    @abstractmethod
    def detect(self, frame) -> list[Detection]:
        """Run detection on a single video frame."""
        raise NotImplementedError
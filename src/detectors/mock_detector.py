from detectors.base import Detection, Detector


class MockDetector(Detector):
    def detect(self, frame) -> list[Detection]:
        height, width = frame.shape[:2]

        return [
            Detection(
                class_name="pothole",
                confidence=0.90,
                bbox=(
                    width * 0.35,
                    height * 0.45,
                    width * 0.55,
                    height * 0.65,
                ),
            )
        ]
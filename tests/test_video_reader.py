from video_reader import get_video_info, read_video


VIDEO_PATH = "sample.mp4"


def test_video_info():
    info = get_video_info(VIDEO_PATH)

    assert info["fps"] > 0
    assert info["frame_count"] == 189
    assert info["duration_seconds"] > 6.0


def test_video_frame_sampling():
    frames = list(read_video(VIDEO_PATH))

    assert len(frames) == 38
    assert frames[0]["frame_number"] == 0
    assert frames[-1]["frame_number"] == 185

    for item in frames:
        assert "frame_number" in item
        assert "timestamp_seconds" in item
        assert item["frame"] is not None

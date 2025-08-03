#!/usr/bin/env python3
"""
Test correct YouTube Transcript API usage
"""

from youtube_transcript_api import YouTubeTranscriptApi
import logging

logging.basicConfig(level=logging.INFO)

def test_correct_api():
    """Test the correct API usage"""
    
    print("=== Testing Correct YouTube Transcript API Usage ===")
    
    # Test video ID (known to have captions)
    test_video_id = "aircAruvnKk"  # 3Blue1Brown neural networks - usually has captions
    
    print(f"Testing with video ID: {test_video_id}")
    
    # Check the actual methods available
    methods = [attr for attr in dir(YouTubeTranscriptApi) if not attr.startswith('_')]
    print(f"Available methods: {methods}")
    
    # Method 1: Try fetch method
    try:
        print("\\n--- Trying fetch method ---")
        transcript = YouTubeTranscriptApi.fetch(test_video_id)
        print(f"SUCCESS: fetch() returned {len(transcript)} entries")
        if transcript:
            print(f"First entry: {transcript[0]}")
        return transcript
    except Exception as e:
        print(f"FAILED: fetch() error: {e}")
    
    # Method 2: Try fetch with language
    try:
        print("\\n--- Trying fetch with English language ---")
        transcript = YouTubeTranscriptApi.fetch(test_video_id, ['en'])
        print(f"SUCCESS: fetch() with language returned {len(transcript)} entries")
        if transcript:
            print(f"First entry: {transcript[0]}")
        return transcript
    except Exception as e:
        print(f"FAILED: fetch() with language error: {e}")
    
    # Method 3: Try list method
    try:
        print("\\n--- Trying list method ---")
        result = YouTubeTranscriptApi.list(test_video_id)
        print(f"SUCCESS: list() returned: {type(result)} - {result}")
        return result
    except Exception as e:
        print(f"FAILED: list() error: {e}")
    
    # Method 4: Check if it's a static method vs instance method
    try:
        print("\\n--- Trying to create instance ---")
        api_instance = YouTubeTranscriptApi()
        print(f"Created instance: {api_instance}")
        
        if hasattr(api_instance, 'fetch'):
            transcript = api_instance.fetch(test_video_id)
            print(f"SUCCESS: instance.fetch() returned {len(transcript)} entries")
            return transcript
    except Exception as e:
        print(f"FAILED: instance method error: {e}")
    
    print("\\nAll methods failed!")
    return None

if __name__ == "__main__":
    result = test_correct_api()
    if result:
        print(f"\\nSUCCESS: Got transcript data with {len(result)} entries")
    else:
        print("\\nFAILED: No method worked")
#!/usr/bin/env python3
"""
Test YouTube Transcript API methods to find the correct usage
"""

from youtube_transcript_api import YouTubeTranscriptApi
import logging

logging.basicConfig(level=logging.INFO)

def test_api_methods():
    """Test different API methods available"""
    
    print("=== Testing YouTube Transcript API Methods ===")
    
    # Check available methods
    api_methods = [method for method in dir(YouTubeTranscriptApi) if not method.startswith('_')]
    print(f"Available methods: {api_methods}")
    
    # Test with a known working video (shorter educational video)
    test_video_id = "dQw4w9WgXcQ"  # Rick Roll - has captions
    
    print(f"\n--- Testing with video ID: {test_video_id} ---")
    
    # Method 1: Direct get_transcript
    try:
        transcript = YouTubeTranscriptApi.get_transcript(test_video_id)
        print(f"✅ get_transcript() worked: {len(transcript)} entries")
        print(f"Sample entry: {transcript[0] if transcript else 'None'}")
        return True
    except Exception as e:
        print(f"❌ get_transcript() failed: {e}")
    
    # Method 2: Check if list_transcripts exists and works
    try:
        if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            print("✅ list_transcripts method exists")
            transcript_list = YouTubeTranscriptApi.list_transcripts(test_video_id)
            print(f"✅ list_transcripts() worked")
            
            transcripts = list(transcript_list)
            print(f"Found {len(transcripts)} transcripts")
            for t in transcripts:
                print(f"  - {t.language_code}: generated={getattr(t, 'is_generated', 'unknown')}")
            
            if transcripts:
                first_transcript = transcripts[0]
                data = first_transcript.fetch()
                print(f"✅ Fetched transcript data: {len(data)} entries")
                return True
        else:
            print("❌ list_transcripts method does not exist")
    except Exception as e:
        print(f"❌ list_transcripts() failed: {e}")
    
    # Method 3: Try with language parameter
    try:
        transcript = YouTubeTranscriptApi.get_transcript(test_video_id, languages=['en'])
        print(f"✅ get_transcript() with languages worked: {len(transcript)} entries")
        return True
    except Exception as e:
        print(f"❌ get_transcript() with languages failed: {e}")
    
    return False

if __name__ == "__main__":
    success = test_api_methods()
    if success:
        print("\n🎉 Found working API method!")
    else:
        print("\n💥 No API methods worked with test video")
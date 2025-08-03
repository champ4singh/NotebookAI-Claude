#!/usr/bin/env python3
"""
Test the fixed YouTube API implementation
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.youtube_service import YouTubeService

async def test_fixed_youtube():
    """Test the fixed YouTube service"""
    
    print("=== Testing Fixed YouTube Service ===")
    
    # Test videos
    test_videos = [
        "https://www.youtube.com/watch?v=aircAruvnKk",  # 3Blue1Brown - known to work
        "https://www.youtube.com/watch?v=hQqgFNlbrYg",  # Original failing video from screenshot
    ]
    
    for i, url in enumerate(test_videos, 1):
        print(f"\n--- Test {i}: {url} ---")
        
        try:
            # Test transcript extraction
            transcript_result = YouTubeService.get_transcript(url)
            print(f"✅ Transcript extracted successfully!")
            print(f"   Language: {transcript_result['language']}")
            print(f"   Length: {len(transcript_result['transcript'])} characters")
            print(f"   Preview: {transcript_result['transcript'][:100]}...")
            
            # Test full processing
            full_result = YouTubeService.process_youtube_url(url)
            print(f"✅ Full processing successful!")
            print(f"   Title: {full_result['title']}")
            print(f"   Content length: {len(full_result['content'])} characters")
            
        except Exception as e:
            print(f"❌ Failed: {str(e)}")
            continue
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_fixed_youtube())
    
    if success:
        print("\n🎉 YouTube service is working!")
        print("You can now try the original failing video in the application.")
    else:
        print("\n💥 Still having issues.")
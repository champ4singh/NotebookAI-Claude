#!/usr/bin/env python3
"""
Test specific YouTube videos that are known to have captions
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.youtube_service import YouTubeService

async def test_youtube_videos():
    """Test YouTube videos with known captions"""
    
    print("=== Testing YouTube Videos with Captions ===")
    
    # Test videos that are known to have captions
    test_videos = [
        # Educational videos that typically have captions
        "https://www.youtube.com/watch?v=aircAruvnKk",  # 3Blue1Brown - Neural Networks
        "https://www.youtube.com/watch?v=YJ-mRlfvROM",  # Machine Learning Explained
        "https://www.youtube.com/watch?v=R9OHn5ZF4Uo",  # Web Development Tutorial
    ]
    
    for i, url in enumerate(test_videos, 1):
        print(f"\n--- Test {i}: {url} ---")
        
        try:
            # Test video ID extraction
            video_id = YouTubeService.extract_video_id(url)
            print(f"✅ Video ID: {video_id}")
            
            # Test video info
            try:
                video_info = YouTubeService.get_video_info(url)
                print(f"✅ Title: {video_info['title']}")
                print(f"✅ Author: {video_info['author']}")
            except Exception as info_error:
                print(f"⚠️  Video info failed: {info_error}")
            
            # Test transcript
            try:
                transcript_data = YouTubeService.get_transcript(url)
                print(f"✅ Transcript Language: {transcript_data['language']}")
                print(f"✅ Transcript Length: {len(transcript_data['transcript'])} characters")
                print(f"✅ Preview: {transcript_data['transcript'][:100]}...")
                
                # Test full processing
                youtube_data = YouTubeService.process_youtube_url(url)
                print(f"✅ Full processing successful!")
                print(f"✅ Final title: {youtube_data['title']}")
                break  # If one works, we're good
                
            except Exception as transcript_error:
                print(f"❌ Transcript failed: {transcript_error}")
                continue
                
        except Exception as e:
            print(f"❌ Failed: {str(e)}")
            continue
    
    else:
        print("\n⚠️  All test videos failed. This might be due to:")
        print("1. Geographic restrictions")
        print("2. API rate limiting")
        print("3. Network issues")
        print("4. YouTube API changes")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_youtube_videos())
    
    if success:
        print("\n🎉 Found working YouTube video!")
    else:
        print("\n💥 No working videos found. Try with educational YouTube videos that have captions.")
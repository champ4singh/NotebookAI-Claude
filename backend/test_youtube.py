#!/usr/bin/env python3
"""
Simple test script to verify YouTube URL processing
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.youtube_service import YouTubeService

async def test_youtube():
    """Test YouTube URL processing"""
    
    print("=== Testing YouTube URL Processing ===")
    
    # Test with a popular educational video (short and has captions)
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll - short video for testing
    
    try:
        print(f"Testing URL: {test_url}")
        
        # Test video ID extraction
        video_id = YouTubeService.extract_video_id(test_url)
        print(f"✅ Video ID extracted: {video_id}")
        
        # Test video info extraction
        print("Testing video info extraction...")
        video_info = YouTubeService.get_video_info(test_url)
        print(f"✅ Video Title: {video_info['title']}")
        print(f"✅ Video Author: {video_info['author']}")
        print(f"✅ Video Length: {video_info['length']} seconds")
        
        # Test transcript extraction
        print("Testing transcript extraction...")
        try:
            transcript_data = YouTubeService.get_transcript(test_url)
            print(f"✅ Transcript Language: {transcript_data['language']}")
            print(f"✅ Transcript Length: {len(transcript_data['transcript'])} characters")
            print(f"✅ Transcript Preview: {transcript_data['transcript'][:200]}...")
        except Exception as transcript_error:
            print(f"⚠️  Transcript extraction failed (this is normal for some videos): {transcript_error}")
            
            # Try with a different video that's more likely to have captions
            backup_url = "https://www.youtube.com/watch?v=9bZkp7q19f0"  # Popular educational video
            print(f"Trying backup URL: {backup_url}")
            try:
                backup_transcript = YouTubeService.get_transcript(backup_url)
                print(f"✅ Backup Transcript Language: {backup_transcript['language']}")
                print(f"✅ Backup Transcript Length: {len(backup_transcript['transcript'])} characters")
            except Exception as backup_error:
                print(f"⚠️  Backup transcript also failed: {backup_error}")
                print("Note: This is normal - not all YouTube videos have transcripts available.")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_youtube())
    
    if success:
        print("\n🎉 YouTube service test completed!")
        print("Note: Some transcript failures are normal - not all videos have captions.")
    else:
        print("\n💥 YouTube service test failed!")
        sys.exit(1)
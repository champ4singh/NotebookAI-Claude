#!/usr/bin/env python3
"""
Debug YouTube transcript issues with specific video
"""

import asyncio
import sys
import os
import logging

# Set up logging to see detailed debug info
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.youtube_service import YouTubeService
from youtube_transcript_api import YouTubeTranscriptApi

async def debug_youtube_video():
    """Debug specific YouTube video transcript issues"""
    
    print("=== Debug YouTube Video Transcript ===")
    
    # URL from the error screenshot
    test_url = "https://youtube.com/watch?v=hQqgFNlbrYg"  # Claude Code video from screenshot
    
    try:
        # Extract video ID
        video_id = YouTubeService.extract_video_id(test_url)
        print(f"✅ Video ID extracted: {video_id}")
        
        # Test direct YouTube Transcript API access
        print(f"\n--- Testing Direct YouTube Transcript API ---")
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            print(f"✅ Got transcript list")
            
            # List all available transcripts
            available_transcripts = list(transcript_list)
            print(f"Available transcripts: {len(available_transcripts)}")
            for transcript in available_transcripts:
                print(f"  - Language: {transcript.language_code}, Is generated: {transcript.is_generated}")
            
            # Try different methods to get transcript
            methods_to_try = [
                ("Manual English", lambda: transcript_list.find_transcript(['en'])),
                ("Manual English variants", lambda: transcript_list.find_transcript(['en', 'en-US', 'en-GB'])),
                ("Generated English", lambda: transcript_list.find_generated_transcript(['en'])),
                ("Generated English variants", lambda: transcript_list.find_generated_transcript(['en', 'en-US', 'en-GB'])),
                ("Any manual", lambda: transcript_list.find_manually_created_transcript(['en'])),
                ("First available", lambda: available_transcripts[0] if available_transcripts else None),
            ]
            
            working_transcript = None
            for method_name, method_func in methods_to_try:
                try:
                    transcript = method_func()
                    if transcript:
                        print(f"✅ {method_name} method worked: {transcript.language_code}")
                        
                        # Try to fetch the actual data
                        try:
                            data = transcript.fetch()
                            print(f"✅ Successfully fetched {len(data)} transcript entries")
                            print(f"✅ First entry: {data[0] if data else 'No entries'}")
                            working_transcript = transcript
                            break
                        except Exception as fetch_error:
                            print(f"❌ {method_name} fetch failed: {fetch_error}")
                            continue
                    else:
                        print(f"❌ {method_name} returned None")
                except Exception as method_error:
                    print(f"❌ {method_name} failed: {method_error}")
                    continue
            
            if working_transcript:
                print(f"\n--- Testing Our Service ---")
                result = YouTubeService.get_transcript(test_url)
                print(f"✅ Our service worked!")
                print(f"✅ Language: {result['language']}")
                print(f"✅ Text length: {len(result['transcript'])}")
                print(f"✅ Preview: {result['transcript'][:200]}...")
                return True
            else:
                print(f"❌ No method worked to get transcript")
                return False
                
        except Exception as api_error:
            print(f"❌ Direct API access failed: {api_error}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(debug_youtube_video())
    
    if success:
        print("\n🎉 Successfully debugged and fixed the issue!")
    else:
        print("\n💥 Still having issues. The video may have restricted transcript access.")
        print("💡 Try with a different educational video like:")
        print("   - https://www.youtube.com/watch?v=aircAruvnKk (3Blue1Brown)")
        print("   - https://www.youtube.com/watch?v=YJ-mRlfvROM (Simple educational content)")
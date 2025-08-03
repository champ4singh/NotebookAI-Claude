"""
YouTube Video Processing Service
Handles YouTube URL processing and transcript extraction
"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, VideoUnavailable, NoTranscriptFound
from pytube import YouTube
import re
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class YouTubeService:
    
    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """Extract YouTube video ID from various URL formats"""
        
        # Common YouTube URL patterns
        patterns = [
            r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]+)',
            r'(?:https?://)?(?:www\.)?youtube\.com/v/([a-zA-Z0-9_-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    @staticmethod
    def get_video_info(url: str) -> Dict[str, str]:
        """Get video information including title, description, etc."""
        
        try:
            yt = YouTube(url)
            
            return {
                "title": yt.title or "Untitled Video",
                "description": yt.description or "",
                "author": yt.author or "Unknown",
                "length": str(yt.length) if yt.length else "0",
                "views": str(yt.views) if yt.views else "0",
                "publish_date": yt.publish_date.isoformat() if yt.publish_date else "",
                "video_id": yt.video_id or ""
            }
            
        except Exception as e:
            logger.error(f"Failed to get video info: {str(e)}")
            # Return basic info with video ID if possible
            video_id = YouTubeService.extract_video_id(url)
            return {
                "title": f"YouTube Video {video_id}" if video_id else "YouTube Video",
                "description": f"Video from {url}",
                "author": "Unknown",
                "length": "0",
                "views": "0", 
                "publish_date": "",
                "video_id": video_id or ""
            }
    
    @staticmethod
    def get_transcript(url: str) -> Dict[str, str]:
        """Get transcript from YouTube video"""
        
        video_id = YouTubeService.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")
        
        logger.info(f"Attempting to get transcript for video ID: {video_id}")
        
        try:
            # Create API instance
            api = YouTubeTranscriptApi()
            logger.info(f"Created YouTubeTranscriptApi instance")
            
            # Method 1: Try direct fetch
            logger.info(f"Trying transcript fetch for video {video_id}")
            try:
                transcript_data = api.fetch(video_id)
                transcript_language = "auto-detected"
                logger.info(f"✅ Got transcript with default fetch, {len(transcript_data)} entries")
            except Exception as fetch_error:
                logger.info(f"Default fetch failed: {fetch_error}")
                
                # Method 2: Try list method to see what's available
                try:
                    transcript_info = api.list(video_id)
                    logger.info(f"Got transcript info: {transcript_info}")
                    
                    # The list method might give us information about available transcripts
                    # Then we might need to fetch with specific parameters
                    if transcript_info:
                        logger.info(f"Transcript info available, trying to extract data")
                        # Try different approaches based on what list returns
                        if isinstance(transcript_info, list) and len(transcript_info) > 0:
                            first_item = transcript_info[0]
                            if isinstance(first_item, dict) and 'text' in first_item:
                                # This is actual transcript data
                                transcript_data = transcript_info
                                transcript_language = "from-list"
                                logger.info(f"✅ Got transcript from list method: {len(transcript_data)} entries")
                            else:
                                logger.info(f"List returned metadata: {first_item}")
                                raise Exception("List method returned metadata, not transcript data")
                        else:
                            raise Exception("List method returned unexpected format")
                    else:
                        raise Exception("List method returned no data")
                except Exception as list_error:
                    logger.error(f"List method failed: {list_error}")
                    raise Exception(f"All transcript extraction methods failed. Last error: {list_error}")
            
            if not transcript_data:
                raise Exception("No transcript data obtained")
            
            # Combine all transcript text
            full_text = ""
            for entry in transcript_data:
                # Handle different entry formats
                try:
                    if hasattr(entry, 'text'):
                        # FetchedTranscriptSnippet object
                        text = entry.text.strip()
                    elif isinstance(entry, dict):
                        # Dictionary format
                        text = entry.get('text', '').strip()
                    else:
                        # Try to convert to string
                        text = str(entry).strip()
                    
                    if text:
                        # Clean up the text (remove extra whitespace, fix common issues)
                        text = re.sub(r'\s+', ' ', text)
                        full_text += text + " "
                except Exception as entry_error:
                    logger.warning(f"Failed to extract text from entry {entry}: {entry_error}")
                    continue
            
            full_text = full_text.strip()
            
            if not full_text:
                logger.error(f"Transcript text is empty for video {video_id}")
                raise Exception("Transcript is empty")
            
            logger.info(f"Successfully extracted transcript for {video_id}, length: {len(full_text)} characters")
            
            return {
                "transcript": full_text,
                "language": transcript_language,
                "video_id": video_id
            }
            
        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"Failed to get transcript for video {video_id}: {str(e)}")
            
            # Provide more specific error messages
            if "no transcript" in error_msg or "no element found" in error_msg:
                raise Exception("This video does not have captions/subtitles available. Please try a different video that has captions enabled.")
            elif "disabled" in error_msg:
                raise Exception("Transcript access is disabled for this video. Please try a different video.")
            elif "private" in error_msg or "unavailable" in error_msg:
                raise Exception("This video is private or unavailable. Please check the URL and try again.")
            elif "age restricted" in error_msg:
                raise Exception("This video is age-restricted and transcripts cannot be accessed.")
            elif "could not retrieve a transcript" in error_msg:
                raise Exception("This video's transcript cannot be accessed through the API. The video may have restricted transcript access.")
            else:
                raise Exception(f"Could not extract transcript: {str(e)}. Please try a different video with captions available.")
    
    @staticmethod
    def process_youtube_url(url: str) -> Dict[str, str]:
        """Process YouTube URL and return video info + transcript"""
        
        try:
            # Validate URL first
            video_id = YouTubeService.extract_video_id(url)
            if not video_id:
                raise Exception("Invalid YouTube URL format. Please provide a valid YouTube video URL.")
            
            # Get video information
            video_info = YouTubeService.get_video_info(url)
            
            # Get transcript
            transcript_data = YouTubeService.get_transcript(url)
            
            # Combine information
            result = {
                "title": video_info["title"],
                "content": transcript_data["transcript"],
                "metadata": {
                    "source_type": "youtube",
                    "url": url,
                    "video_id": video_info["video_id"],
                    "author": video_info["author"],
                    "description": video_info["description"],
                    "length": video_info["length"],
                    "views": video_info["views"],
                    "publish_date": video_info["publish_date"],
                    "transcript_language": transcript_data["language"]
                }
            }
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to process YouTube URL {url}: {error_msg}")
            
            # Check if it's already a user-friendly error message
            if any(phrase in error_msg.lower() for phrase in [
                "does not have captions", "transcript access is disabled", 
                "private or unavailable", "age-restricted", "invalid youtube url"
            ]):
                # Re-raise user-friendly errors as-is
                raise Exception(error_msg)
            else:
                # Generic fallback message
                raise Exception(f"Failed to process YouTube video. {error_msg} Please ensure the video has captions available and try again.")
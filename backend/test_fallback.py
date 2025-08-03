#!/usr/bin/env python3
"""
Simple test script to verify the Gemini model fallback mechanism
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.services.rag_service import RAGService

async def test_fallback():
    """Test the model fallback mechanism"""
    
    print("=== Testing Gemini Model Fallback Mechanism ===")
    
    try:
        # Create RAG service instance
        rag_service = RAGService()
        
        print(f"Configured fallback models: {rag_service.model_fallbacks}")
        
        # Test with a simple prompt that doesn't require document context
        test_context = """
[Document: test.txt]
This is a test document containing information about Python programming.
Python is a high-level programming language known for its simplicity and readability.
"""
        
        test_question = "What is Python?"
        
        print(f"\nTesting with question: '{test_question}'")
        print("This will attempt each model in the fallback sequence...")
        
        # Call the LLM response method directly
        response, citations = await rag_service._generate_llm_response(test_question, test_context)
        
        print(f"\n✅ SUCCESS!")
        print(f"Model used: {rag_service.current_model}")
        print(f"Response length: {len(response)} characters")
        print(f"Citations found: {len(citations)}")
        print(f"Response preview: {response[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    # Run the test
    success = asyncio.run(test_fallback())
    
    if success:
        print("\n🎉 Fallback mechanism test completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Fallback mechanism test failed!")
        sys.exit(1)
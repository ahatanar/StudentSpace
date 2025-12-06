"""
Firebase Storage service for handling file uploads.

This module provides utilities for uploading, validating, and deleting
club images (icons and banners) in Firebase Storage.
"""

import os
import io
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
import firebase_admin
from firebase_admin import storage
from PIL import Image

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp'
}

# File size limit (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

# Storage bucket name (from environment or default)
STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET')


class StorageService:
    """Service for managing file uploads to Firebase Storage."""
    
    @staticmethod
    def is_configured() -> bool:
        """Check if Firebase Storage is properly configured."""
        return STORAGE_BUCKET is not None
    
    @staticmethod
    def validate_image_file(file: UploadFile) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded image file.
        
        Args:
            file: The uploaded file from FastAPI
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return False, f"File size ({file_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size (5MB)"
        
        if file_size == 0:
            return False, "File is empty"
        
        # Check MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            return False, f"Invalid file type. Allowed types: JPG, PNG, WebP"
        
        # Check file extension
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        
        # Validate it's actually an image by trying to open it
        try:
            file.file.seek(0)
            img = Image.open(file.file)
            img.verify()  # Verify it's a valid image
            file.file.seek(0)  # Reset for later use
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
        
        return True, None
    
    @staticmethod
    def upload_club_image(club_id: str, file: UploadFile, image_type: str) -> str:
        """
        Upload a club image to Firebase Storage.
        
        Args:
            club_id: The club's document ID
            file: The uploaded file
            image_type: Either 'icon' or 'banner'
            
        Returns:
            Public URL of the uploaded image
            
        Raises:
            HTTPException: If upload fails or validation fails
        """
        if not StorageService.is_configured():
            raise HTTPException(
                status_code=500,
                detail="Firebase Storage not configured. Please set FIREBASE_STORAGE_BUCKET environment variable."
            )
        
        # Validate image type
        if image_type not in ['icon', 'banner']:
            raise HTTPException(status_code=400, detail="Invalid image type. Must be 'icon' or 'banner'")
        
        # Validate file
        is_valid, error_msg = StorageService.validate_image_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        try:
            # Get file extension
            filename = file.filename or ""
            ext = os.path.splitext(filename)[1].lower()
            
            # Create storage path: clubs/{club_id}/{icon|banner}.{ext}
            storage_path = f"clubs/{club_id}/{image_type}{ext}"
            
            # Get storage bucket
            bucket = storage.bucket(STORAGE_BUCKET)
            blob = bucket.blob(storage_path)
            
            # Read file content
            file.file.seek(0)
            file_content = file.file.read()
            
            # Upload to Firebase Storage
            blob.upload_from_string(
                file_content,
                content_type=file.content_type
            )
            
            # Make the blob publicly accessible
            blob.make_public()
            
            # Return public URL
            public_url = blob.public_url
            return public_url
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload image: {str(e)}"
            )
    
    @staticmethod
    def delete_club_image(club_id: str, image_type: str) -> bool:
        """
        Delete a club image from Firebase Storage.
        
        Args:
            club_id: The club's document ID
            image_type: Either 'icon' or 'banner'
            
        Returns:
            True if deletion was successful
            
        Raises:
            HTTPException: If deletion fails
        """
        if not StorageService.is_configured():
            raise HTTPException(
                status_code=500,
                detail="Firebase Storage not configured"
            )
        
        # Validate image type
        if image_type not in ['icon', 'banner']:
            raise HTTPException(status_code=400, detail="Invalid image type")
        
        try:
            # Get storage bucket
            bucket = storage.bucket(STORAGE_BUCKET)
            
            # Try to delete all possible extensions
            deleted = False
            for ext in ALLOWED_EXTENSIONS:
                storage_path = f"clubs/{club_id}/{image_type}{ext}"
                blob = bucket.blob(storage_path)
                
                if blob.exists():
                    blob.delete()
                    deleted = True
            
            return deleted
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete image: {str(e)}"
            )

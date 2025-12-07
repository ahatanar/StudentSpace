"""
Services package - handles Firebase initialization and exports services.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Initialize Firebase Admin
# Supports: 
# 1. FIREBASE_SERVICE_ACCOUNT_JSON env var containing the JSON string
# 2. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a file
# 3. serviceAccountKey.json file in root directory
db = None

try:
    if not firebase_admin._apps:
        service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
        cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
        storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
        
        if service_account_json:
            # Parse JSON string from environment variable
            cred_dict = json.loads(service_account_json)
            cred = credentials.Certificate(cred_dict)
            # Initialize with storage bucket if provided
            if storage_bucket:
                firebase_admin.initialize_app(cred, {
                    'storageBucket': storage_bucket
                })
            else:
                firebase_admin.initialize_app(cred)
            print("Firebase initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var")
        elif os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            # Initialize with storage bucket if provided
            if storage_bucket:
                firebase_admin.initialize_app(cred, {
                    'storageBucket': storage_bucket
                })
            else:
                firebase_admin.initialize_app(cred)
            print(f"Firebase initialized from {cred_path}")
        else:
            print(f"Warning: No Firebase credentials found. Firestore features will fail.")
            
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    db = None


# Import services for convenience
from app.services.user_service import UserService
from app.services.club_service import ClubService

__all__ = ['db', 'UserService', 'ClubService']

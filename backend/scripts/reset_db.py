import firebase_admin
from firebase_admin import credentials, firestore
import os

def reset_database():
    """
    WARNING: This script deletes ALL data from the Firestore database.
    Collections cleared: users, clubs, club_memberships, events
    """
    print("Initializing Firebase...")
    
    # Initialize Firebase (copied from services.py logic)
    if not firebase_admin._apps:
        cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print(f"Error: {cred_path} not found. Cannot connect to Firestore.")
            return

    db = firestore.client()
    
    collections_to_clear = ['users', 'clubs', 'club_memberships', 'events']
    
    print("Starting database reset...")
    
    for collection_name in collections_to_clear:
        print(f"Clearing collection: {collection_name}")
        delete_collection(db.collection(collection_name), 10)
        
    print("Database reset complete.")

def delete_collection(coll_ref, batch_size):
    """
    Deletes a collection in batches.
    """
    docs = coll_ref.limit(batch_size).stream()
    deleted = 0

    for doc in docs:
        print(f"Deleting doc: {doc.id}")
        doc.reference.delete()
        deleted += 1

    if deleted >= batch_size:
        return delete_collection(coll_ref, batch_size)

if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA from Firestore. Type 'yes' to continue: ")
    if confirm.lower() == 'yes':
        reset_database()
    else:
        print("Operation cancelled.")

import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Initialize Firebase
if not firebase_admin._apps:
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print(f"Error: {cred_path} not found.")
        sys.exit(1)

db = firestore.client()

def make_admin(email: str):
    """
    Find user by email and set is_admin=True
    """
    print(f"Searching for user with email: {email}...")
    
    # Query users collection by email
    users_ref = db.collection('users')
    query = users_ref.where('email', '==', email).limit(1)
    docs = query.stream()
    
    user_doc = None
    for doc in docs:
        user_doc = doc
        break
        
    if not user_doc:
        print(f"User with email {email} not found in database.")
        print("Note: The user must have logged in at least once to exist in the database.")
        return
        
    # Update user
    print(f"Found user: {user_doc.id} ({user_doc.get('display_name')})")
    users_ref.document(user_doc.id).update({'is_admin': True})
    print(f"Successfully promoted {email} to System Admin.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
        
    email = sys.argv[1]
    make_admin(email)

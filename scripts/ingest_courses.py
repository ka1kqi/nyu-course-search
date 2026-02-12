import os
import requests
import json
from dotenv import load_dotenv
from supabase import create_client, Client
import nomic
from nomic import embed
from tqdm import tqdm
import time
import string

load_dotenv(dotenv_path=".env.local")

# Supabase setup
url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials in .env.local")
    exit(1)

supabase: Client = create_client(url, key)

# Nomic setup
nomic_api_key = os.getenv("NOMIC_API_KEY")
if not nomic_api_key:
    # Optional: If you don't have Nomic, you can skip embedding generation 
    # but the vector search won't work.
    print("Warning: Missing NOMIC_API_KEY. Embeddings will not be generated.")

if nomic_api_key:
    nomic.login(nomic_api_key)

CLASS_SEARCH_URL = "https://bulletins.nyu.edu/class-search/api/?page=fose&route=search"
TERMS = ["1254"] # Focus on Spring 2025 for now to be faster

def fetch_courses_by_keyword(term, keyword):
    headers = {
        "Content-Type": "application/json",
         "User-Agent": "Mozilla/5.0"
    }
    payload = {
        "other": {"srcdb": term},
        "criteria": [{"field": "keyword", "value": keyword}]
    }
    try:
        response = requests.post(CLASS_SEARCH_URL, json=payload, headers=headers)
        if response.status_code == 200:
            return response.json().get("results", [])
    except Exception as e:
        print(f"Error fetching {keyword}: {e}")
    return []

def process_and_ingest():
    all_courses_map = {} # deduplicate by code

    # Iterate a-z to get a broad range of courses
    # fetching "Computer Science" works, but we want more.
    # The API limits results (~500?). Iterating letters helps coverage.
    keywords = list(string.ascii_uppercase) # ['A', 'B', ... 'Z']
    
    # Just for demo speed, let's limit to likely tech/science letters or just common ones
    # or iterate all if the user wants full coverage.
    # To be safe and reasonably fast, let's try a few broad categories or just A-Z.
    
    print(f"Fetching courses for term {TERMS[0]} by iterating keywords A-Z...")
    
    for kw in tqdm(keywords, desc="Keywords"):
        results = fetch_courses_by_keyword(TERMS[0], kw)
        for c in results:
            code = c.get("code")
            if code and code not in all_courses_map:
                all_courses_map[code] = c
                
    unique_courses = list(all_courses_map.values())
    print(f"Total unique courses found: {len(unique_courses)}")
    
    if not unique_courses:
        return

    # Prepare for embedding
    rows_to_insert = []
    texts_to_embed = []
    
    # Pre-filter: only process if we have title/code
    valid_courses = []
    for c in unique_courses:
        if c.get("code") and c.get("title"):
            valid_courses.append(c)
            # Embed: "Active Learning: CS-UY 1124. This course covers..."
            text = f"{c['title']}: {c['code']}. {c.get('description', '')}"
            texts_to_embed.append(text)

    # Batch Process
    BATCH_SIZE = 50
    for i in tqdm(range(0, len(valid_courses), BATCH_SIZE), desc="Embedding"):
        batch_courses = valid_courses[i : i + BATCH_SIZE]
        batch_texts = texts_to_embed[i : i + BATCH_SIZE]
        
        embeddings = []
        if nomic_api_key:
            try:
                output = embed.text(
                    texts=batch_texts,
                    model='nomic-embed-text-v1.5',
                    task_type='search_document'
                )
                embeddings = output['embeddings']
            except Exception as e:
                print(f"Embedding error batch {i}: {e}")
                continue
        else:
            # Mock or skip
            embeddings = [[0]*768 for _ in batch_texts]

        batch_rows = []
        for j, course in enumerate(batch_courses):
            batch_rows.append({
                "course_code": course["code"],
                "title": course["title"],
                "description": course.get("description", ""),
                "embedding": embeddings[j],
                "metadata": course
            })
            
        try:
            supabase.table("courses").upsert(batch_rows).execute()
        except Exception as e:
             print(f"Supabase upsert error: {e}")

if __name__ == "__main__":
    process_and_ingest()

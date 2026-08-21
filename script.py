import os
import re
import json
import requests

API_URL = "https://akash-go.ahmed-bd-org.workers.dev"
OUTPUT_DIR = "Bangla"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def parse_m3u_to_json(m3u_text):
    """M3U কনটেন্ট থেকে JSON লিস্ট তৈরি করে"""
    channels = []
    lines = m3u_text.strip().split('\n')
    
    current_channel = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('#EXTINF:'):
            current_channel = {}
            
            # tvg-logo এক্সট্র্যাক্ট করা
            logo_match = re.search(r'tvg-logo="([^"]+)"', line)
            current_channel['logo'] = logo_match.group(1) if logo_match else ""
            
            # group-title এক্সট্র্যাক্ট করা
            group_match = re.search(r'group-title="([^"]+)"', line)
            current_channel['group'] = group_match.group(1) if group_match else "General"
            
            # চ্যানেলের নাম এক্সট্র্যাক্ট করা
            if ',' in line:
                current_channel['name'] = line.split(',', 1)[1].strip()
            else:
                current_channel['name'] = "Unknown Channel"
                
        elif line and not line.startswith('#'):
            if 'name' in current_channel:
                current_channel['url'] = line
                channels.append(current_channel)
                current_channel = {}
                
    return channels

def generate_playlists():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    
    try:
        print("Fetching playlist data from API...")
        response = requests.get(API_URL, headers=headers, timeout=20)
        response.raise_for_status()

        m3u_text = response.text.strip()

        if not m3u_text:
            raise ValueError("API returned empty response!")

        # 🔑 প্রধান পরিবর্তন: http:// লিঙ্কগুলোকে https:// তে কনভার্ট করা
        m3u_text = m3u_text.replace("http://", "https://")

        # ১. M3U ফাইল সেভ করা
        m3u_file_path = os.path.join(OUTPUT_DIR, "playlist.m3u")
        with open(m3u_file_path, "w", encoding="utf-8") as f:
            f.write(m3u_text)
        print("✅ M3U playlist saved with HTTPS URLs.")

        # ২. M3U থেকে ডাটা পার্স করে JSON তৈরি করা
        json_data = parse_m3u_to_json(m3u_text)

        # ৩. JSON ফাইল সেভ করা
        json_file_path = os.path.join(OUTPUT_DIR, "playlist.json")
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent=4)
            
        print(f"✅ JSON playlist saved with HTTPS URLs ({len(json_data)} channels found).")

    except Exception as e:
        print(f"❌ Error generating playlists: {e}")

if __name__ == "__main__":
    generate_playlists()

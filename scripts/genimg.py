#!/usr/bin/env python3
"""Text-to-image with the Gemini API.

usage: GEMINI_API_KEY=... genimg.py MODEL OUT SIZE RATIO < prompt.txt
  MODEL  e.g. gemini-3-pro-image (4K) or gemini-3.1-flash-image (2K)
  SIZE   1K | 2K | 4K
  RATIO  e.g. 16:9

The key is read from the environment only. Image models return 429 with "limit: 0" on a free-tier key.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

if len(sys.argv) != 5:
    print(__doc__)
    sys.exit(2)
key = os.environ["GEMINI_API_KEY"]
model, out, size, ratio = sys.argv[1:5]
prompt = sys.stdin.read()
body = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ratio, "imageSize": size}},
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "x-goog-api-key": key},
)
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read()[:400].decode(errors="replace"))
    sys.exit(1)
cand = d.get("candidates", [{}])[0]
saved = False
for p in cand.get("content", {}).get("parts", []):
    if "inlineData" in p:
        with open(out, "wb") as f:
            f.write(base64.b64decode(p["inlineData"]["data"]))
        saved = True
        print("saved", out, p["inlineData"]["mimeType"])
    elif "text" in p:
        print("text:", p["text"][:200])
if not saved:
    print("no image; finishReason:", cand.get("finishReason"), json.dumps(d)[:300])
    sys.exit(1)
u = d.get("usageMetadata", {})
print("usage:", u.get("promptTokenCount"), u.get("candidatesTokenCount"))

#!/usr/bin/env python3
"""Image-to-image with the Gemini API: edit a picture, or generate a plate consistent with a reference.

usage: GEMINI_API_KEY=... genedit.py MODEL OUT SIZE RATIO REF_IMAGE [REF_IMAGE...] < prompt.txt

Typical prompts: "remove the phone from the desk, keep everything else identical";
"same character as the reference, medium close-up, mouth open mid-sentence, empty wall on the right".
"""
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

if len(sys.argv) < 6:
    print(__doc__)
    sys.exit(2)
key = os.environ["GEMINI_API_KEY"]
model, out, size, ratio = sys.argv[1:5]
refs = sys.argv[5:]
prompt = sys.stdin.read()
parts = []
for r in refs:
    mt = mimetypes.guess_type(r)[0] or "image/jpeg"
    with open(r, "rb") as f:
        parts.append({"inlineData": {"mimeType": mt, "data": base64.b64encode(f.read()).decode()}})
parts.append({"text": prompt})
body = {
    "contents": [{"parts": parts}],
    "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ratio, "imageSize": size}},
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "x-goog-api-key": key},
)
try:
    with urllib.request.urlopen(req, timeout=600) as r:
        d = json.load(r)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read()[:300].decode(errors="replace"))
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
        print("text:", p["text"][:160])
if not saved:
    print("no image; finishReason:", cand.get("finishReason"), json.dumps(d)[:300])
    sys.exit(1)

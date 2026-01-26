#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

EMAIL="${SMOKE_TEST_EMAIL:-${DEV_LOGIN_EMAIL:-}}"
if [ -z "${EMAIL}" ]; then
  echo "Missing SMOKE_TEST_EMAIL or DEV_LOGIN_EMAIL." >&2
  exit 1
fi

curl -s -o /dev/null http://127.0.0.1:3000/estimate || {
  echo "Dev server not responding on http://127.0.0.1:3000." >&2
  exit 1
}

COOKIE_JAR="$(mktemp)"
cleanup() {
  rm -f "${COOKIE_JAR}" /tmp/ai-smoke.json /tmp/draft-smoke.json /tmp/export-smoke.json
  rm -f /tmp/vision-smoke.jpg /tmp/transcribe-smoke.wav /tmp/vision.json /tmp/transcribe.json
}
trap cleanup EXIT

printf '{"email":"%s"}' "${EMAIL}" > /tmp/dev-login.json
login_code=$(curl -s -o /tmp/dev-login.out -w "%{http_code}" -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/dev-login.json \
  http://127.0.0.1:3000/api/auth/dev-login)

if [ "${login_code}" != "200" ]; then
  echo "Dev login failed (status ${login_code})." >&2
  cat /tmp/dev-login.out >&2
  exit 1
fi

session_id=$(node scripts/smoke/create_walkthrough_session.mjs)
if [ -z "${session_id}" ]; then
  echo "Failed to create walkthrough session." >&2
  exit 1
fi

cat <<'JSON' > /tmp/ai-smoke.json
{
  "messages": [
    {
      "id": "1",
      "role": "user",
      "parts": [
        { "type": "text", "text": "Reply with OK." }
      ]
    }
  ],
  "context": {}
}
JSON

ai_code=$(curl -s -o /tmp/ai-smoke.out -w "%{http_code}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/ai-smoke.json \
  http://127.0.0.1:3000/api/ai)

if [ "${ai_code}" != "200" ]; then
  echo "AI endpoint failed (status ${ai_code})." >&2
  cat /tmp/ai-smoke.out >&2
  exit 1
fi

cat <<'JSON' > /tmp/draft-smoke.json
{
  "notes": "Two new 20A circuits to kitchen, 6 duplexes, 1 GFCI, homeruns to panel A.",
  "context": {
    "project": { "projectName": "CLI Smoke" },
    "parameters": { "laborRate": 118, "materialTaxRate": 0.1025, "overheadProfitRate": 0 },
    "lineItems": []
  }
}
JSON

draft_code=$(curl -s -o /tmp/draft-smoke.out -w "%{http_code}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/draft-smoke.json \
  http://127.0.0.1:3000/api/draft-items)

if [ "${draft_code}" != "200" ]; then
  echo "Draft endpoint failed (status ${draft_code})." >&2
  cat /tmp/draft-smoke.out >&2
  exit 1
fi

cat <<'JSON' > /tmp/export-smoke.json
{
  "project": { "projectName": "CLI Smoke" },
  "parameters": {},
  "items": [
    {
      "category": "GENERAL_CONDITIONS",
      "description": "Smoke item",
      "quantity": 1,
      "unitType": "Lot",
      "materialUnitCost": 100,
      "laborHoursPerUnit": 1
    }
  ]
}
JSON

export_code=$(curl -s -o /tmp/export-smoke.xlsx -w "%{http_code}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/export-smoke.json \
  http://127.0.0.1:3000/api/export)

if [ "${export_code}" != "200" ]; then
  echo "Export endpoint failed (status ${export_code})." >&2
  exit 1
fi

python3 - <<'PY'
try:
    from PIL import Image
except Exception as exc:
    raise SystemExit(f"PIL is required for smoke image generation: {exc}")

img = Image.new('RGB', (256, 256), color=(255, 255, 255))
img.save('/tmp/vision-smoke.jpg', format='JPEG')
PY

python3 - <<'PY'
import wave
from pathlib import Path

path = Path('/tmp/transcribe-smoke.wav')
with wave.open(str(path), 'w') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(16000)
    wav.writeframes(b'\\x00\\x00' * 16000)
PY

transcribe_code=$(curl -s -o /tmp/transcribe.json -w "%{http_code}" -b "${COOKIE_JAR}" \
  -F "audio=@/tmp/transcribe-smoke.wav;type=audio/wav" \
  -F "session_id=${session_id}" \
  http://127.0.0.1:3000/api/transcribe)

if [ "${transcribe_code}" != "200" ]; then
  echo "Transcribe endpoint failed (status ${transcribe_code})." >&2
  cat /tmp/transcribe.json >&2
  exit 1
fi

vision_code=$(curl -s -o /tmp/vision.json -w "%{http_code}" -b "${COOKIE_JAR}" \
  -F "image=@/tmp/vision-smoke.jpg;type=image/jpeg" \
  -F "session_id=${session_id}" \
  http://127.0.0.1:3000/api/vision-count)

if [ "${vision_code}" != "200" ]; then
  echo "Vision endpoint failed (status ${vision_code})." >&2
  cat /tmp/vision.json >&2
  exit 1
fi

echo "Smoke tests passed."

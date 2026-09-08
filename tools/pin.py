#!/usr/bin/env python3
"""
Post one pin to Pinterest.

First run — fill in SECRET and CODE below, then:

    python3 tools/pin.py thanksgiving

CODE comes from opening the URL this prints when CODE is empty, approving,
and copying the code= value out of the address bar. The token it gets back is
saved to ~/.puzzleten-pinterest.json, so after the first run you only need:

    python3 tools/pin.py winter

Titles and descriptions come from tools/pin-copy.json; images from
tools/pins/. Nothing is hard-coded per theme.
"""

import base64, json, pathlib, ssl, sys, urllib.error, urllib.parse, urllib.request

# ─── fill these in ──────────────────────────────────────────────
SECRET = "d5bbf2c72862d6cc4a978afe66fff48cd1b579f1"       # app secret from developers.pinterest.com
CODE    = "a5d703ff17ddcf0f48af4e63f027e9d2b5103d29"      # only needed once, to get a token
# ────────────────────────────────────────────────────────────────

APP_ID   = "1609496"
REDIRECT = "https://puzzleten.com/"
# Pinterest rejects the call with "Missing: ['boards:write']" unless the token
# carries it, even though nothing here creates a board. Asking for the full set
# is harmless — the app only ever touches its owner's own account.
SCOPES   = "boards:read,boards:write,pins:read,pins:write"
API      = "https://api.pinterest.com/v5"

ROOT  = pathlib.Path(__file__).resolve().parent.parent
STATE = pathlib.Path.home() / ".puzzleten-pinterest.json"

# The python.org macOS build has no CA certificates until you run its
# "Install Certificates.command"; certifi's bundle works around that.
try:
    import certifi
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()


def request(url, data=None, headers=None, form=False):
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=headers or {},
                                 method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, context=CTX) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        where = url.replace(API, "").split("?")[0] or "/"
        sys.exit(f"Pinterest said {e.code} on {where}: {e.read().decode()[:400]}")
    except urllib.error.URLError as e:
        if "CERTIFICATE_VERIFY_FAILED" in str(e.reason):
            sys.exit("No CA certificates. Run:  python3 -m pip install certifi")
        raise


def get_token():
    if STATE.exists():
        return json.loads(STATE.read_text())["access_token"]

    if not SECRET:
        sys.exit("Put your app secret into SECRET at the top of this file.")
    if not CODE:
        sys.exit("Open this, approve, then put the code= value into CODE:\n\n  "
                 + "https://www.pinterest.com/oauth/?" + urllib.parse.urlencode({
                     "client_id": APP_ID, "redirect_uri": REDIRECT,
                     "response_type": "code", "scope": SCOPES}) + "\n")

    basic = base64.b64encode(f"{APP_ID}:{SECRET}".encode()).decode()
    data = request(f"{API}/oauth/token",
                   {"grant_type": "authorization_code", "code": CODE,
                    "redirect_uri": REDIRECT},
                   {"Authorization": f"Basic {basic}"}, form=True)
    STATE.write_text(json.dumps(data, indent=2))
    STATE.chmod(0o600)
    print(f"Token saved to {STATE}. You can clear CODE now.")
    return data["access_token"]


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python3 tools/pin.py <theme>   e.g. thanksgiving")
    theme = sys.argv[1]

    image = ROOT / "tools/pins" / f"{theme}.png"
    copy = json.loads((ROOT / "tools/pin-copy.json").read_text())
    if not image.exists():
        sys.exit(f"No image at {image}. Run: python3 tools/build-pins.py")
    if theme not in copy:
        sys.exit(f"No title/description for '{theme}' in tools/pin-copy.json")

    token = get_token()
    auth = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    boards = request(f"{API}/boards?page_size=100", headers=auth)["items"]
    board = next((b for b in boards if "word search" in b["name"].lower()), None)
    if not board:
        sys.exit("No board with 'word search' in the name. Create one on Pinterest first.\n"
                 "Boards found: " + ", ".join(b["name"] for b in boards))

    pin = request(f"{API}/pins", {
        "board_id": board["id"],
        "title": copy[theme]["title"],
        "description": copy[theme]["description"],
        "link": f"https://puzzleten.com/wordsearch/{theme}.html",
        "media_source": {"source_type": "image_base64",
                         "content_type": "image/png",
                         "data": base64.b64encode(image.read_bytes()).decode()},
    }, auth)

    print(f"Posted to “{board['name']}”:")
    print(f"  https://www.pinterest.com/pin/{pin['id']}/")


if __name__ == "__main__":
    main()

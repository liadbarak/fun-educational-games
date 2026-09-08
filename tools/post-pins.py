#!/usr/bin/env python3
"""
Post pins to Pinterest through the official API, instead of by hand.

    # once, after the app has trial access granted
    python3 tools/post-pins.py login
    python3 tools/post-pins.py token <code-from-the-browser-url>

    # then, whenever
    python3 tools/post-pins.py boards          # list boards, get an id
    python3 tools/post-pins.py post 3          # post the next 3 unposted pins
    python3 tools/post-pins.py status          # what is posted, what is left

Deliberate choices:

- **Paced, not bulk.** `post` takes a count and defaults to 2. A days-old
  account firing twenty pins through an API is what spam detection is for.
- **Remembers what it posted**, in the state file, so re-running never
  duplicates a pin.
- **Credentials live outside the repo**, in ~/.puzzleten/pinterest.json, so
  a secret can never be committed by accident.
- **Images go up as base64**, not as URLs. The pin images are gitignored on
  purpose; committing 22 files of ~1MB to make them fetchable would be pure
  bloat.

Needs an app at developers.pinterest.com with scopes pins:write and
boards:read, and https://puzzleten.com/ registered as a redirect URI.
"""

import base64
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.pinterest.com/v5"
REDIRECT = "https://puzzleten.com/"
SCOPES = "boards:read,pins:read,pins:write"

ROOT = pathlib.Path(__file__).resolve().parent.parent
PINS = ROOT / "tools/pins"
COPY = ROOT / "tools/pin-copy.json"
LINK = "https://puzzleten.com/wordsearch/{key}.html"

# Outside the repo on purpose: this holds the app secret and the tokens.
HOME = pathlib.Path.home() / ".puzzleten"
CONF = HOME / "pinterest.json"

# Seasonal first, because those have a deadline; then evergreen by demand.
ORDER = [
    "halloween", "christmas", "thanksgiving", "winter", "newyear",
    "dinosaurs", "space", "ocean", "farm", "animals", "produce",
    "transport", "weather", "school", "sports", "body", "food", "colours",
    "valentines", "stpatricks", "easter", "spring",
]


def load():
    if not CONF.exists():
        sys.exit(
            f"No config at {CONF}.\n\n"
            "Create it with your app's credentials:\n\n"
            '  mkdir -p ~/.puzzleten && cat > ~/.puzzleten/pinterest.json <<EOF\n'
            '  {\n'
            '    "app_id": "1609496",\n'
            '    "app_secret": "PASTE_IT_HERE",\n'
            '    "board_id": "",\n'
            '    "posted": []\n'
            '  }\n'
            '  EOF\n'
        )
    return json.loads(CONF.read_text())


def save(conf):
    HOME.mkdir(exist_ok=True)
    CONF.write_text(json.dumps(conf, indent=2) + "\n")
    CONF.chmod(0o600)


def call(conf, method, path, body=None):
    req = urllib.request.Request(
        f"{API}{path}", method=method,
        data=json.dumps(body).encode() if body else None,
        headers={
            "Authorization": f"Bearer {conf['access_token']}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:500]
        if e.code == 401:
            sys.exit(f"401 — the token has expired. Run `login` then `token` again.\n{detail}")
        sys.exit(f"Pinterest returned {e.code}: {detail}")


def cmd_login(conf):
    url = "https://www.pinterest.com/oauth/?" + urllib.parse.urlencode({
        "client_id": conf["app_id"],
        "redirect_uri": REDIRECT,
        "response_type": "code",
        "scope": SCOPES,
    })
    print("Open this, approve, then copy the ?code= value out of the address bar:\n")
    print(url)
    print("\nThen: python3 tools/post-pins.py token <code>")


def cmd_token(conf, code):
    basic = base64.b64encode(
        f"{conf['app_id']}:{conf['app_secret']}".encode()).decode()
    req = urllib.request.Request(
        f"{API}/oauth/token", method="POST",
        data=urllib.parse.urlencode({
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT,
        }).encode(),
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Token exchange failed ({e.code}): {e.read().decode()[:500]}")

    conf["access_token"] = data["access_token"]
    conf["refresh_token"] = data.get("refresh_token", "")
    save(conf)
    print("Token saved. Access tokens last 30 days; re-run login/token when it expires.")


def cmd_boards(conf):
    for b in call(conf, "GET", "/boards?page_size=50").get("items", []):
        print(f"{b['id']}  {b['name']}")
    print("\nPut the right id into board_id in ~/.puzzleten/pinterest.json")


def cmd_status(conf):
    copy = json.loads(COPY.read_text())
    posted = set(conf.get("posted", []))
    for key in ORDER:
        have_img = (PINS / f"{key}.png").exists()
        mark = "posted" if key in posted else ("ready" if have_img and key in copy else "MISSING")
        print(f"  {key:14} {mark}")
    print(f"\n{len(posted)} posted, {len(ORDER) - len(posted)} to go")


def cmd_post(conf, count):
    if not conf.get("board_id"):
        sys.exit("No board_id set. Run `boards` and put one into the config.")
    copy = json.loads(COPY.read_text())
    posted = conf.setdefault("posted", [])

    queue = [k for k in ORDER
             if k not in posted and k in copy and (PINS / f"{k}.png").exists()]
    if not queue:
        sys.exit("Nothing left to post.")

    for key in queue[:count]:
        image = base64.b64encode((PINS / f"{key}.png").read_bytes()).decode()
        pin = call(conf, "POST", "/pins", {
            "board_id": conf["board_id"],
            "title": copy[key]["title"],
            "description": copy[key]["description"],
            "link": LINK.format(key=key),
            "media_source": {
                "source_type": "image_base64",
                "content_type": "image/png",
                "data": image,
            },
        })
        posted.append(key)
        save(conf)          # after each one, so a failure halfway loses nothing
        print(f"posted {key}  →  https://www.pinterest.com/pin/{pin['id']}/")

    left = len([k for k in ORDER if k not in posted])
    print(f"\n{left} still to go. Two or three a day is the pace to keep.")


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    conf = load()
    cmd = args[0]

    if cmd == "login":
        cmd_login(conf)
    elif cmd == "token":
        if len(args) < 2:
            sys.exit("Usage: post-pins.py token <code>")
        cmd_token(conf, args[1])
    elif cmd == "boards":
        cmd_boards(conf)
    elif cmd == "status":
        cmd_status(conf)
    elif cmd == "post":
        cmd_post(conf, int(args[1]) if len(args) > 1 else 2)
    else:
        sys.exit(f"Unknown command: {cmd}\n{__doc__}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Screenshot tools/pin.html once per theme, producing 1000x1500 Pinterest images.

Pinterest wants a 2:3 portrait image; anything else gets cropped or shown
small. The pins are built from the real game, so they can never advertise a
puzzle the site would not actually generate.

    python3 -m http.server 8000          # from the project root
    python3 tools/build-pins.py          # writes into tools/pins/

Needs Chrome and the websocket-client package.
"""

import base64
import json
import pathlib
import re
import signal
import subprocess
import sys
import time
import urllib.request

import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = "http://localhost:8000"
PORT = 9500
OUT = pathlib.Path(__file__).parent / "pins"
ROOT = pathlib.Path(__file__).resolve().parent.parent


def theme_keys():
    """Read the themes from the game rather than keeping a second list here."""
    src = (ROOT / "wordsearch/themes.js").read_text()
    return re.findall(r"key: '([a-z]+)'", src)


def main():
    OUT.mkdir(exist_ok=True)
    keys = theme_keys()
    print(f"{len(keys)} themes: {', '.join(keys)}\n")

    chrome = subprocess.Popen(
        [CHROME, "--headless", "--disable-gpu", f"--remote-debugging-port={PORT}",
         "--remote-allow-origins=*", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        ws_url = None
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://localhost:{PORT}/json"))
                ws_url = next(t for t in tabs if t["type"] == "page")["webSocketDebuggerUrl"]
                break
            except Exception:
                time.sleep(0.2)
        if not ws_url:
            sys.exit("Chrome never came up")

        ws = websocket.create_connection(ws_url, timeout=60)
        counter = [0]

        def send(method, params=None):
            counter[0] += 1
            ws.send(json.dumps({"id": counter[0], "method": method, "params": params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == counter[0]:
                    return msg

        send("Page.enable")
        send("Runtime.enable")
        send("Emulation.setDeviceMetricsOverride",
             {"width": 1000, "height": 1500, "deviceScaleFactor": 2, "mobile": False})

        for key in keys:
            send("Page.navigate", {"url": f"{BASE}/tools/pin.html?theme={key}"})

            ready = False
            for _ in range(50):
                time.sleep(0.2)
                got = send("Runtime.evaluate",
                           {"expression": "!!window.PIN_READY", "returnByValue": True})
                if got["result"]["result"].get("value"):
                    ready = True
                    break
            if not ready:
                print(f"  {key}: never finished drawing — skipped")
                continue

            shot = send("Page.captureScreenshot",
                        {"format": "png", "captureBeyondViewport": False})
            path = OUT / f"{key}.png"
            path.write_bytes(base64.b64decode(shot["result"]["data"]))
            print(f"  {key}: {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")

        print(f"\nDone. {len(list(OUT.glob('*.png')))} pins in {OUT.relative_to(ROOT)}/")
    finally:
        chrome.send_signal(signal.SIGTERM)
        try:
            chrome.wait(timeout=10)
        except Exception:
            chrome.kill()


if __name__ == "__main__":
    main()

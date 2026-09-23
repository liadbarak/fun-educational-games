# Random Name Picker

Static client-side utility reusing shared utility styles, cryptographic random sampling and aggregate utility analytics. Names are held only in memory; no storage, API, or name-valued analytics. The page does not load advertising code. No new dependencies.

Each nonblank trimmed line is an entry, including duplicate names. A batch samples distinct entries. Removal discards only the selected entries. Reset restores the original parsed list; editing the textarea starts a new list. Disabling removal stops further removal but does not restore already removed entries (use Reset List). Oversized quantity options are disabled and the selection returns to one when necessary.

Winner selection precedes a 1.2-second cosmetic name cycle. Controls lock during a draw. Reduced-motion users get immediate results. Results use textContent, so pasted HTML remains text.

Run `node --test tests/*.test.js` and open `/tests/name-picker.html` for browser checks. The static repository has no package build or configured lint command; syntax checks and `git diff --check` supplement tests.

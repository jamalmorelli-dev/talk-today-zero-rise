# Talk Today — ZERO RISE

English lesson for the 50 ZERO RISE words. Drill, Find, Speak, and Match. The page is `Index.html`. Pictures and audio live in `v3/`.

## What the student does

1. This copy opens as Jamal Morelli. Email sign-in is the later door.
2. Drill: hear the word, tap the picture. A miss plays “Oops” and the word again. Two misses light the right card. A hit plays the sentence. The screen stays pictures. A finished set is the pictures, spoken one by one.
3. Find: hear a word and tap it in the set.
4. Speak: hear the word, hear “Your turn,” then tap the red button. A pass is a real score from the teacher line. If that line is offline, nothing is scored and no coins move.
5. Match: pair the sound card with the picture card.

Coins move when a word levels up, and once when a set is finished. Practice repeats do not pay. The streak is a display. These coins are local to this app. They are not the school TT Coins ledger.

Gear follows the set. Listen plays the slow word for a new question-word. Question plays the plain word. Say it plays “Where is the …?” when that recording exists. The beat button is off until the student turns it on.

## Build

```bash
node build.js
node test/engine_test.js
node test/gas_sim.js
node serve.js 8792
```

`build.js` writes `Index.html` from `src/template.html`, `src/style.css`, `src/engine.js`, and `src/app.js`.

Open with `?cls=ClassName` to store the class on the learner. Open with `?api=` once to store a different Apps Script `/exec` URL.

## Sheet

`Code.gs` is the Apps Script behind the sheet. Deploy it as a web app, execute as you, access for anyone who has the link. The page posts `init`, `sync`, `restore`, and `speak`. Speak audio is the field `audio` (base64) with `mime`. Older `audioBase64` / `mimeType` names are accepted too. A failed post does not pay coins.

The OpenAI key stays in Script Properties. Recordings are saved to Drive only when `SAVE_AUDIO` is `1`.

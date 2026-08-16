# Results

Every number here has the command that produced it. Node v22.17.0, Windows 11.

## Test suite

```
$ npm test
# tests 11
# pass 11
# fail 0
# duration_ms 25.4372
```

```
$ npm run verify
10/11 checks fail against the original.
```

The one check the original passes — *"no figure is ever NaN"* — passes
**vacuously**: the original produces no figures at all, so the loop over them
has nothing to test. It is left in the count rather than dropped, because that
vacuous pass is itself the finding.

What the other 10 catch:

| Check | Why the original fails it |
|---|---|
| salary split conserves the money | no split exists |
| salary figures are the documented arithmetic | no figures exist |
| projection has one row per year and grows | no projection exists |
| savings liquid + deployable = input | no split exists |
| investment allocation sums, downside < expected | no allocation exists |
| real value < nominal value | no inflation adjustment exists |
| unknown type rejected | `default:` branch answers `"crypto"` anyway |
| junk amounts rejected | `if (!amount)` accepts `-5000` and `"abc"` |
| age/years out of range rejected | never validated |
| page loads no local filesystem paths | `<img src="C:/Users/advai/Downloads/…">` ×3 |

## Deterministic planner

```
$ node -e '…10,000 calls per type, process.hrtime.bigint()…'
salary      0.0017 ms/call
savings     0.0030 ms/call
investment  0.0043 ms/call
```

Figures produced per call: salary 6, savings 5, investment 6, plus one
projection row per year. Identical inputs give byte-identical JSON — there is no
sampling anywhere in this path.

## The model layer, measured against the baseline it sits on

The rule from `workflow.md`: the model has to beat the boring version on a
number, or it is decoration. Here it does not *replace* the boring version — it
sits on top of it — so the honest comparison is what each side contributes:

| | Deterministic planner | Groq layer |
|---|---|---|
| Figures produced | 6 per call | **0** |
| Latency | 0.0017–0.0043 ms | not measured — no key available |
| Variance across runs | none, byte-identical | sampled, varies |
| Works offline | yes | no |
| Cost | none | tokens per call |

**So the model is not the product; the arithmetic is.** The model earns its place
on the one job the planner cannot do — turning six numbers into "here is what
this means and here are the two ways it goes wrong" — and it is wired so it can
never touch a figure: the prompt hands it the computed plan and instructs it not
to recompute, and its reply is rendered in a separate block from the table.

The original had this backwards: 100% of its output came from the model and 0%
of it could be checked.

### Not yet measured

Latency and tokens per advice call, and whether the model ever contradicts a
figure it was given. No `GROQ_API_KEY` was available. The command that fills
this in:

```bash
GROQ_API_KEY=... npm start
curl -s -X POST localhost:5000/api/finance -H 'Content-Type: application/json' \
  -d '{"type":"salary","amount":100000}' | jq '{adviceMs, adviceTokens, advice}'
```

`adviceMs` and `adviceTokens` are already in the response for exactly this
reason. Until that is run, **no accuracy or latency claim is made for the advice
layer** — do not put one on a résumé.

## Degradation

```
$ GROQ_API_KEY=gsk_fake_key_for_degradation_test node server.js
$ curl … -d '{"type":"salary","amount":50000}'
adviceStatus: off: Groq returned 401
figures still present: true 25000
```

No key, bad key, timeout: the numbers ship, `advice` is `null`, and
`adviceStatus` says why. Never a crash, never a silent empty result.

## Frontend

Driven headless with Playwright against the running server
(`scratchpad/uicheck.py`):

```
BASIS: 50/30/20 split of 80000 INR/month; emergency fund = 6x monthly needs
   Needs Per Month = ₹40,000
   Wants Per Month = ₹24,000
   Save Per Month = ₹16,000
   Emergency Fund Target = ₹2,40,000
   Months To Fund Emergency = 15
   Invested After Years = ₹9,60,000
BARS: ['73.5%', '79.4%', '85.7%', '92.6%', '100%']
STATUS: Advice: off: GROQ_API_KEY not set
CONSOLE ERRORS: none
FAILED REQUESTS: none
ERROR PATH: amount must be a finite number greater than 0
```

`FAILED REQUESTS: none` is the direct regression test for the old broken
`<img src="C:/…">` paths.

Two things found by actually looking at the rendered page rather than the DOM:

- The projection bars were present in the DOM with correct widths but visually
  invisible — the middle column had no width to expand into and `opacity:.25`
  washed them out. Fixed in CSS. **The DOM assertion passed while the page was
  wrong**, which is the same class of bug as the rest of this project.
- `-5` in the amount field never reaches the server at all: `min="1"` on the
  input blocks submission natively. The server-side 400 path had to be tested
  with native validation disabled. Both layers work; only the second is a
  security boundary.

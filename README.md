# MoneyPort

Salary, savings and investment planning for INR amounts. **Every rupee figure is
computed in code. The language model never produces a number — it is handed the
computed plan and asked to explain it.**

That split is the whole design. It is also the fix for what this project used to
be: a form that pasted a number into a prompt and printed whatever came back.

```
npm install
npm start                      # http://localhost:5000
npm test                       # 11 checks, no network, ~25 ms
npm run verify                 # the same checks against the original code
```

The advice layer is optional:

```bash
GROQ_API_KEY=... npm start     # env var only; there is no fallback default
```

Without a key the app still works — every figure is produced, and the page says
`Advice: off: GROQ_API_KEY not set`. Same on a timeout, a 401 or a rate limit.

## What it computes

| Type | Basis | Returns |
|---|---|---|
| `salary` (monthly) | 50/30/20 split; emergency fund = 6× monthly needs | bucket amounts, fund target, months to fund it, N-year projection nominal and inflation-adjusted |
| `savings` (lump sum) | 30% held liquid, 70% deployed | liquid/deployable split, value and gain after N years, real value |
| `investment` (lump sum) | equity% = 100 − age | equity/debt split, blended return, expected and downside value, real value |

Defaults (8% salary growth, 6% inflation, 12% equity, 7% debt, age 30, 5 years)
are Indian retail rules of thumb, set in one object at the top of `finance.js`.
They are knobs, not truths — override them per request.

## API

```bash
curl -X POST localhost:5000/api/finance \
  -H 'Content-Type: application/json' \
  -d '{"type":"salary","amount":100000,"years":5}'
```

```json
{
  "type": "salary", "amount": 100000, "years": 5,
  "basis": "50/30/20 split of 100000 INR/month; emergency fund = 6x monthly needs",
  "figures": { "needsPerMonth": 50000, "wantsPerMonth": 30000, "savePerMonth": 20000,
               "emergencyFundTarget": 300000, "monthsToFundEmergency": 15,
               "investedAfterYears": 1200000 },
  "projection": [ { "year": 1, "monthly": 108000, "realMonthly": 101887 }, "..." ],
  "advice": null, "adviceStatus": "off: GROQ_API_KEY not set"
}
```

`type` must be `salary`, `savings` or `investment`. `amount` must be a finite
number above 0. `age` is 18–100, `years` is 1–40. Anything else is a `400` with
the reason — nothing is silently clamped, because a clamped input is a wrong
answer that looks right.

**This is not financial advice.** It applies published rules of thumb to a number
you type in.

## What was broken

The version in `original/` was two files, no `package.json`, and no entry point —
it had never run in that state. Nothing in it raised an error either:

| Symptom | Cause |
|---|---|
| No result could be checked | the app computed nothing; it interpolated the amount into a prompt |
| `type: "crypto"` gave confident advice | the `switch` fell through to `default: "Provide financial guidance."` |
| Negative and non-numeric amounts accepted | the only guard was `if (!amount \|\| !type)`, which passes `-5000` and `"abc"` |
| Dashboard images never appeared, no error | `<img src="C:/Users/advai/Downloads/img2.png">` — browsers block `file:` from an `http:` page. One path was mangled to `C:/Usersadvai\Downloads\img3.jpg` |
| Missing key killed the whole app | `process.exit(1)` at import |

**Root cause: there was no computation to be right or wrong about.** All five
symptoms come from that one fact — with nothing to verify, nothing was verified.
The fix is not better prompts, it is `finance.js`.

`original/` is kept in the repo as the record. `npm run verify` runs today's
checks against its logic: **10 of 11 fail.**

## Layout

```
finance.js        the arithmetic. Pure functions, no I/O, no model
server.js         one endpoint + static files. Explanation layer, degrades to off
public/index.html the whole frontend. No build step, no framework
test.js           11 checks, one per bug above
verify_tests.js   the same checks against original/
original/         the code this replaced
```

Cut from the previous version: React, react-router, recharts, axios, cors,
dotenv, an unused login page, and 88 lines of commented-out server. One runtime
dependency remains (express); Node 20+ supplies `fetch` and the test runner.

// Proves the suite is worth having: run the same checks against the original
// implementation and count the failures. A suite the old code passes is decoration.
//
// The original (original/server.js) cannot be required — it needs axios and
// dotenv, and exits at import when GROQ_API_KEY is missing. So its decision
// logic is reproduced here verbatim in shape: a switch on `type` that builds a
// prompt string, the route's `if (!amount || !type)` guard, and nothing else.
// It returns prose, so it has no `figures` and no `projection` at all.
const path = require('node:path');
const { checks } = require('./test');

function originalPlan(type, amount) {
  if (!amount || !type) throw new Error('Amount and type are required'); // the route's only guard
  const prompt = {
    investment: `...Investment Amount: ${amount} INR...`,
    salary: `...Current Salary: ${amount} INR...`,
    savings: `...Savings Amount: ${amount} INR...`,
  }[type] ?? 'Provide financial guidance.';        // unknown type: answered anyway
  return { suggestions: prompt.split('\n').filter(Boolean), figures: {}, projection: [] };
}

const PAGE = path.join(__dirname, 'original', 'Dashboard.js');
let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn(originalPlan, PAGE);
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n        ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`\n${failed}/${checks.length} checks fail against the original.`);

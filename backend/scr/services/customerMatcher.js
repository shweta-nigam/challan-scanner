
/**
 * Customer matching service
 * Priority: phone > exact name > alias > fuzzy (Levenshtein distance)
 */

/** Normalize a string for comparison */
function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple Levenshtein distance */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Match a scanned name/phone against a list of customer documents.
 * Returns { customer, confidence, method } or { customer: null, confidence: "none" }
 */
export function matchCustomer(customers, { name = "", phone = "" }) {
  if (!customers || customers.length === 0) {
    return { customer: null, confidence: "none", method: "" };
  }

  const normPhone = phone.replace(/\D/g, "").slice(-10); // last 10 digits
  const normName = normalize(name);

  // 1. Phone match (high confidence)
  if (normPhone.length >= 10) {
    const byPhone = customers.find((c) => {
      const cp = c.phone.replace(/\D/g, "").slice(-10);
      return cp.length >= 10 && cp === normPhone;
    });
    if (byPhone) return { customer: byPhone, confidence: "high", method: "phone" };
  }

  // 2. Exact name match (high)
  const byExact = customers.find((c) => normalize(c.name) === normName);
  if (byExact) return { customer: byExact, confidence: "high", method: "exact" };

  // 3. Alias match (high)
  const byAlias = customers.find((c) =>
    c.aliases.some((alias) => normalize(alias) === normName)
  );
  if (byAlias) return { customer: byAlias, confidence: "high", method: "alias" };

  // 4. Fuzzy match — distance ≤ 3 (medium confidence)
  let best = null;
  let bestDist = Infinity;
  for (const c of customers) {
    const dist = levenshtein(normName, normalize(c.name));
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
    for (const alias of c.aliases) {
      const ad = levenshtein(normName, normalize(alias));
      if (ad < bestDist) {
        bestDist = ad;
        best = c;
      }
    }
  }
  if (bestDist <= 3 && best) {
    return { customer: best, confidence: "medium", method: "fuzzy" };
  }

  return { customer: null, confidence: "none", method: "" };
}

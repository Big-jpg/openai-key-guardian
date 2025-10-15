Hi — automated security scanner (non‑malicious) detected an exposed API key pattern in this repository.

**File:** <FILE> (line <LINE>)  
**Snippet (redacted):** `OPENAI_API_KEY=[REDACTED-EXPOSED-KEY]`  
**Link:** <URL>

**Recommended actions:**
1. Rotate/revoke the key in your OpenAI dashboard.
2. Remove the key from this repository.
3. Purge from Git history (git filter-repo / BFG).
4. Use a secrets manager; enable GitHub Secret Scanning + push protection.

This is an automated, non‑malicious notice. Reply to opt‑out and we will exclude this repo.


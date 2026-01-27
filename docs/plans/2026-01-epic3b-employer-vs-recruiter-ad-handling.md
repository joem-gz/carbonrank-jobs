# Codex Agent Prompt — Epic 3b: Recruiter/Agency-posted Job Ad Handling (Employer Signals)

## Context
We’re implementing Epic 3 “Employer impact signals” (Companies House SIC + ONS intensity band + SBTi badge). The extension scrapes job ads and calls backend endpoints:
- GET /api/employer/resolve?name=...&hint_location=...
- GET /api/employer/signals?company_number=...

Problem: Many job adverts are posted by a recruitment/temporary staffing agency on behalf of the true employer (which may be undisclosed). We must not compute “employer signals” using the agency’s identity.

Example Reed ad (provided by user):
https://www.reed.co.uk/jobs/temp-medical-receptionist-leading-oxford-clinic-asap-start/56379967
Contains multiple explicit disclosures like: “Office Angels is an employment agency… acts as an employment business…”

## Goal
1) Detect when the *poster* is likely an employment agency / recruiter.
2) Prevent employer signals from being derived from the agency.
3) Attempt to extract/resolve the true employer if present; otherwise show “Employer not disclosed” and allow user override.
4) Keep commute/location CO2 unchanged (location is still typically the actual workplace).

## Requirements (functional)
A) Data model (extension-side, passed through to backend calls)
- Track two distinct org roles per job:
  - poster/advertiser: { name, isAgencyHint, reasons[] }
  - hiringEmployer: { nameCandidate?, company_number?, confidence?, reasons[] } (may be unknown)

B) Detection (spotting) — implement a classifier that produces:
- poster.isAgencyHint: boolean
- poster.reasons: string[]
Use the following signals (ordered by confidence):
1. Explicit disclosure text in page body (HIGH):
   - Regex match phrases such as:
     - “is an employment agency”
     - “is an employment agency and business”
     - “acts as an employment agency”
     - “acts as an employment business”
     - “employment agency for permanent recruitment”
     - “employment business for the supply of temporary workers”
   - Store which regex matched in reasons[]
2. Companies House SIC check on poster name (HIGH once resolved):
   - If poster resolves to a company with SIC codes in employment activities (78xx family, esp. 78101/78109/78200/78300), classify as agency.
   - This belongs server-side (see below), but the extension should be able to consume the classification and treat it as decisive.
3. Text heuristics in description (MEDIUM):
   - “our client”, “on behalf of”, “we are recruiting for”, etc.
   - Use as supporting evidence only (don’t mark agency solely from this unless combined with other signals).

C) Employer candidate extraction (attempts, but safe)
- Attempt to identify an end-employer name candidate using:
  1) JSON-LD JobPosting if present:
     - Parse application/ld+json blocks.
     - If JobPosting.hiringOrganization.name exists and is non-empty:
       - If it differs materially from poster name, treat as employerNameCandidate (medium confidence).
  2) Description heuristics:
     - If pattern like “Our client is <ORG>” appears, extract <ORG> as employerNameCandidate (low confidence).
- Never overwrite employerNameCandidate with poster name if poster.isAgencyHint is true.

D) Backend changes
1) Extend /api/employer/resolve response schema:
   - Add:
     - org_classification: "employer" | "agency" | "unknown"
     - classification_reasons: string[] (e.g. “sic_78200”, “sic_78109”)
   - Classification rule (v1):
     - If any returned SIC code is one of {78101, 78109, 78200, 78300} OR begins with “78” => org_classification="agency".
     - Else org_classification="employer" (or "unknown" if no SIC codes).
2) Ensure /api/employer/signals is only called for hiringEmployer.company_number, not poster.
3) Optional: add an endpoint or allow resolve by name to return both candidates + classification in one call (keep it simple; don’t redesign everything).

E) Extension behavior + UI states
- If poster classified as agency AND no employerNameCandidate:
  - Employer panel shows:
    - “Employer not disclosed (advert posted by recruitment agency)”
    - Show poster name separately as “Advertiser”
    - No SIC/ONS/SBTi shown (since no employer)
    - Offer “Set employer” action (override)
- If poster classified as agency BUT employerNameCandidate exists:
  - Run employer resolve on employerNameCandidate; show match confidence.
  - Only show employer signals if confidence clears existing threshold.
- If poster not agency:
  - Current flow unchanged.

F) User override
- Add a lightweight override mapping in extension storage:
  - Key: (job_site_domain + poster_name) OR (job_site_domain + job_id)
  - Value: employer company_number + display name
- When override exists, treat hiringEmployer as resolved and load signals for that company_number.
- Provide “Clear override” control.

## Non-goals
- Do not claim the agency is “good/bad”; only classify for correct enrichment.
- Do not attempt “hidden employer” inference beyond heuristics above.
- No heavy NLP; keep deterministic.

## Deliverables
1) Extension:
   - Implement agency detection module + reasons
   - Implement employer candidate extraction (JSON-LD + simple text pattern)
   - Update employer signals UI states + advertiser display + override flow
2) Server:
   - Extend employer resolve response with org_classification + reasons based on SIC
   - Ensure signals are computed only for hiring employer
3) Tests:
   - Add fixtures + unit tests for:
     - Agency disclosure regex detection (use the Reed example HTML snippet as a fixture)
     - JSON-LD parsing for hiringOrganization
     - Server classification from SIC codes
     - UI rendering states:
       - non-agency employer resolved
       - agency + employer unknown
       - agency + employer candidate low confidence
       - agency + override set
4) Manual validation checklist (quick)
   - Visit the Reed example ad:
     - Confirm agency is detected
     - Confirm employer signals are not shown for “Office Angels”
     - Confirm commute/location still appears
     - Confirm override allows selecting a company and then signals load for that company

## Acceptance criteria
- Employer signals never use the recruitment firm when ad is agency-posted.
- When employer undisclosed, UI clearly states “Employer not disclosed” and offers override.
- Classification is explainable via reasons[] (regex matches and/or SIC-based reasons).
- Tests cover the main paths above.

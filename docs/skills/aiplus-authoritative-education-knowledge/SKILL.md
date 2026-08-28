# AIPLuS Authoritative Education Knowledge

This skill governs the AIPLuS Authoritative Education Knowledge (AEK) program.

## 0. Program identity and merge gate

The AEK program is one release line composed of **AEK-00 through AEK-10 plus AEK-QA**. A completed subtask, phase, source adapter, taxonomy slice or verifier is not the completion of the program.

**Do not merge the AEK branch to `main` until every AEK-00..AEK-10 work package and the full AEK-QA acceptance set are complete on one final head SHA, Draft validation is green, the exact-head Preview is verified, Ready validation is green again on that same head SHA, and the normal `expected_head_sha` merge/prod closure can proceed.**

The durable progress owner is `docs/architecture/AIPLUS-AEK-STATUS.md`. A new maintainer or new ChatGPT conversation must read that file and continue the first incomplete work package rather than reconstructing the plan from chat history.

## 1. Product mission

AEK is not an encyclopedia feature. It gives parents and students authoritative explanations for education/admissions concepts while preserving the existing AIPLuS architecture.

It must answer classes of questions such as:

- What is X? What does X mean? How should I understand it?
- What is the difference between X and Y?
- Is this term an official undergraduate major, graduate discipline, vocational major, policy term, school-specific label, industry term or occupation?
- Who does a policy apply to and what does it mean for application decisions?
- What does the current admissions cycle or Liaoning policy say?
- How does a specific school implement the general rule?
- What can be explained from stable canonical knowledge, and what must be verified live?

The knowledge domain is intentionally bounded to higher education, gaokao/admissions, majors/disciplines, vocational education, education credentials/labels, training rules, relevant occupations/industries and parent-facing concepts needed for college application decisions. It is not a general-purpose web encyclopedia.

## 2. Mandatory architecture

Use the existing AIPLuS owners:

`command/semantic interpretation -> intent contract -> turn orchestrator -> existing deterministic/official evidence owners -> advisor presentation -> existing browser/workspace`

Do not create a second agent, chat runtime, workspace, conversation history, renderer, admissions truth set, general web crawler, cache hierarchy or release identity.

`functions/_lib/ai/turn-orchestrator.js` remains the single turn execution owner. `functions/_lib/ai/official-web-evidence.js` remains the general official-web discovery/reader gateway unless a later architecture proof replaces it globally. Existing admissions score/rank/history owners remain unchanged.

## 3. Knowledge ownership model

AEK separates four responsibilities without creating four answer systems:

1. **Canonical knowledge** — stable/versioned normative entities, identities and relations.
2. **Cycle/jurisdiction live evidence** — current-year national/provincial rules and time-sensitive policy facts.
3. **School-specific official evidence** — current school implementation, charter, training plan, fees, campus, restrictions, etc.
4. **Existing deterministic admissions truth** — scores, ranks, school/major histories and candidate facts owned by current AIPLuS/admissions resources.

All four normalize into one evidence model and one answer composer/presentation path.

Models may interpret, compare and explain evidence. They must not invent factual definitions, eligibility, dates, amounts, restrictions, approval state, school implementation or admissions facts that are not supported by the relevant owner.

## 4. Knowledge temperature / freshness

Every knowledge entity/fact must be classified before retrieval:

- **T0 stable** — basic concepts with slow change. Prefer canonical local knowledge.
- **T1 versioned canonical** — official catalogues/directories (undergraduate majors, graduate disciplines, vocational majors, occupation classifications). Store with source/version/effective metadata.
- **T2 cycle-bound** — admissions-year policy. Live authoritative evidence is required for current-year claims; local canonical text may explain only the stable concept.
- **T3 school-bound** — school-specific current rules or implementation. Prefer current school/CHSI official evidence.
- **T4 dynamic** — current approval/status/list/deadline/eligibility state. Live authoritative evidence is mandatory.

A cached or local record must never silently satisfy a stricter freshness class.

## 5. Authority routing

Authority depends on the knowledge domain; do not use one source for every question.

Preferred source classes:

- national education rules/catalogues: Ministry of Education, State Council Academic Degrees Committee and other competent national authorities;
- national gaokao/admissions explanation: Ministry of Education and CHSI/Yangguang Gaokao official properties;
- Liaoning policy: Liaoning education/admissions authorities and official provincial policy publications;
- school implementation: official school admissions site, verified school `.edu.cn` pages, official charter, academic affairs/college training plan, and existing CHSI school evidence where appropriate;
- Sino-foreign cooperation: Ministry of Education supervision/approval information;
- occupations: Ministry of Human Resources and Social Security official occupation classification;
- engineering accreditation: competent official/recognized accreditation authority and official published lists.

Third-party pages may be used only where an existing product policy explicitly permits a clearly labelled supplement. They must not define admissions policy, eligibility, current approval/status, medical/physical restrictions or official education identities.

## 6. Canonical entity model

Do not build a library of generated encyclopedia articles. Build structured, source-traceable entities and relations. Typical fields include:

- canonical ID/name and aliases;
- entity type and education level;
- official code, parent/category and relationships;
- stable definition facts and common misunderstandings;
- authority, source title/URL/version;
- publication/effective dates;
- jurisdiction/cycle/freshness class;
- refresh policy.

Natural-language explanations are composed at answer time from structured facts and evidence.

Canonical types must distinguish at least:

- undergraduate major / major class / discipline category;
- graduate discipline / professional degree category;
- vocational major;
- admissions/policy concept;
- institution/education label;
- training concept;
- occupation;
- industry/technical concept;
- school-specific label/direction;
- unknown/ambiguous term.

Never collapse `major`, `discipline`, `occupation` and `industry concept` into one type.

## 7. Semantic and context firewall

A knowledge-definition question can start a new semantic object even when the workspace remembers a school, major, score or candidate view.

Typical definition/comparison language includes:

- `X是什么 / X是什么意思 / X啥意思`
- `解释一下X / 介绍一下X是什么意思 / 怎么理解X`
- `X和Y有什么区别`
- `X属于什么 / X是干什么的`

When the current text contains a knowledge entity/question but does not explicitly refer to the remembered school/score/candidate filter, do **not** let old school focus turn the question into `school_research`, and do not commit candidate mutations.

Remembered context is not execution authority. Reuse school, score, region or candidate constraints only when the user explicitly reconnects them (for example `沈工大的高校专项呢`, `我580分符合这个吗`).

## 8. Unknown and ambiguity are valid states

Resolution order:

1. exact canonical match;
2. explicit alias match;
3. bounded near-match / related canonical candidates;
4. source-specific term detection and authoritative context lookup;
5. `unknown`.

If a phrase such as `材料加工与工业控制` is not confirmed as an official canonical major name, AIPLuS must not fabricate a major definition merely because the words resemble known majors. It should explain the resolution status, offer verified nearby canonical concepts when useful, and seek the source context only when needed.

`unknown` must never be silently converted to `general_advice` plus model memory.

## 9. Human answer contract

Knowledge answers are Answer First:

1. one- or two-sentence plain-language answer;
2. what type of concept it is;
3. who/when it matters to;
4. practical impact on application decisions where relevant;
5. commonly confused concepts/relations;
6. current-year/jurisdiction changes only when evidence supports them;
7. compact authority/source evidence after the answer.

Do not lead a concept answer with a stale school identity card or engineering/debug state.

## 10. Evidence contract

Time-sensitive or externally sourced knowledge should normalize to fields equivalent to:

- issuer;
- title;
- source URL;
- authority level/source class;
- knowledge type/canonical entity;
- published date;
- effective year/from/to;
- jurisdiction;
- excerpt/structured facts;
- retrieved time.

Facts must retain provenance. A model may simplify wording but cannot widen subject scope, year scope or jurisdiction beyond the evidence.

## 11. Knowledge-gap mining

AEK must measure its unknowns instead of accumulating one-off regex patches. Track at least:

- canonical exact;
- alias resolved;
- near/ambiguous;
- live policy resolved;
- school-specific resolved;
- unknown;
- general-advice fallback;
- wrong-context inheritance.

A frequent unknown may enter a candidate queue for authority research, but it must not become canonical knowledge merely because an LLM or one search result described it.

## 12. AEK work packages

The whole program remains open until all of these are complete:

- **AEK-00** Skill, architecture contract and durable handoff state.
- **AEK-01** `knowledge_explain` semantic ownership and context firewall.
- **AEK-02** education/admissions knowledge taxonomy.
- **AEK-03** canonical education entity index and version/provenance model.
- **AEK-04** concept relations and common-confusion graph.
- **AEK-05** authoritative source registry and source-policy routing.
- **AEK-06** knowledge temperature/freshness governance.
- **AEK-07** unified retrieval/evidence owner using existing official/deterministic bridges.
- **AEK-08** ambiguity, non-canonical terms and fail-closed behavior.
- **AEK-09** human Answer-First knowledge presentation and next actions.
- **AEK-10** unknown mining/coverage audit and maintainability handoff.
- **AEK-QA** multi-turn semantic, source, freshness, fail-closed, browser and regression proof.

A subtask must update `docs/architecture/AIPLUS-AEK-STATUS.md` but must not remove the whole-program merge gate.

## 13. Required QA families

The final verifier set must include, at minimum:

- old school context -> new policy concept without school pollution;
- concept -> personal eligibility follow-up;
- concept -> explicit school implementation follow-up;
- concept -> explicit score/reachability follow-up;
- exact canonical undergraduate major;
- undergraduate major vs graduate discipline distinction;
- non-canonical/source-specific terminology such as `材料加工与工业控制`;
- current-cycle Liaoning policy requiring live evidence;
- stale-year evidence rejection;
- official-source unavailable behavior: stable concept may still be explained, current conditions must fail closed;
- relation/common-confusion answers;
- no candidate-view mutation for pure knowledge questions;
- existing school/history/major-region/candidate/decision journeys remain green;
- PC/Pad/Android browser behavior if browser-visible presentation changes.

The mature suite should grow beyond isolated examples; multi-turn journeys are mandatory because context contamination is a primary failure class.

## 14. Prohibited shortcuts

Do not solve a new concept by first adding a keyword, regex, prompt paragraph or standalone source adapter. First classify the taxonomy domain, canonical identity, authority, freshness and existing owner.

Do not make `general_advice` the catch-all knowledge tool.

Do not pre-generate free-form encyclopedia prose as the durable truth store.

Do not make a successful network search sufficient for canonical ingestion.

Do not weaken existing fail-closed admissions/source contracts to improve answer coverage.

**One question must not create one fix. One new concept must not create one new owner.**

## 15. Startup and handoff protocol

Every AEK engineering session must:

1. read latest `main` and open PRs;
2. read `AGENTS.md`;
3. read `docs/skills/eastern-philosophy/SKILL.md`;
4. read `docs/skills/unified-site-release/SKILL.md` when production/runtime/release surfaces are involved;
5. read this skill;
6. read `docs/architecture/START-HERE.md`;
7. read `docs/architecture/AIPLUS-AEK-STATUS.md` from the active AEK branch/PR;
8. continue the first incomplete AEK work package on the same program branch/PR where safe;
9. re-audit ownership and update the status file after meaningful progress.

When a chat/session ends, GitHub state—not private chat memory—must be sufficient for the next maintainer to determine the exact remaining work and merge prohibition.

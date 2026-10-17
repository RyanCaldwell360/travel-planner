---
type: Reference
title: OKF format reference
description: Official specification and bundle conventions used for this handoff.
status: draft
tags:
- travel-planner
- codex-handoff
generated:
  by: chatgpt/handoff-author
  at: '2026-10-17T18:10:00Z'
sources:
- id: interview
  resource: /references/interview.md
  title: Ryan product discovery interview, 2026-10-17
- id: okf-spec
  resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
  title: Open Knowledge Format v0.2 specification
evidence_class: format-reference
---

# Canonical reference

- [GoogleCloudPlatform Open Knowledge Format specification](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
- [Raw specification](https://raw.githubusercontent.com/GoogleCloudPlatform/open-knowledge-format/main/SPEC.md)

Retrieved October 17, 2026. The retrieved specification identifies version 0.2. This bundle uses Markdown concepts with YAML `type`, linked concepts, directory indexes, and a dated log. Root index declares `okf_version`. No attested computation contract is claimed: PTO logic is specified for implementation and testing, not distributed as an executed/attested runtime.

## Local conventions

`evidence_class` is a producer-defined field. Each concept records the interview as its source; this reference also records the official specification below. All generated content remains draft pending product review. Unknown employer inputs are not promoted into verified facts. Links starting `/` resolve from this knowledge bundle root.

The validator checks the structural subset used here: parseable frontmatter and nonempty types, reserved-file conventions, declared version, valid internal document paths, source footnotes, and generated timestamps. It does not claim endorsement or certification by Google.

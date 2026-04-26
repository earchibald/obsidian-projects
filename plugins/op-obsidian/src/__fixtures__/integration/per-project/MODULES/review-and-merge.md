---
id: review-and-merge
title: Adversarial review then merge
type: workflow-module
scope: review
order: 10
---

Once tests pass and CI is green, request an adversarial Copilot review with concrete pressure-test prompts. After review is addressed, merge with `gh pr merge --squash --delete-branch`. PR: {{pr_url}}. Issue: {{id}} (parent: {{parent}}).

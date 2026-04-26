---
id: plan-rules
title: Plan-mode rules for fixture project
type: workflow-module
scope: plan
order: 10
vars:
  - "max_files=10"
  - reviewer_handle
---

Before implementing, read related code (no more than {{vars.max_files}} files), then propose a plan covering: approach, files to touch, tests, risks, and what's deliberately out of scope. Send the plan to {{vars.reviewer_handle}} for sign-off before any commit.

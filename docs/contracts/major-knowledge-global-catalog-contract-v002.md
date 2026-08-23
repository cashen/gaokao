# Major Knowledge Global Catalog Contract v002

## Purpose

PR192 does not create a single example major description.

The goal is to establish a complete professional knowledge foundation that can serve all undergraduate majors and connect consistently with school-major admission data.

## Scope

The owner is not a collection of isolated articles.

It is a major domain catalog.

```
Major Identity
      |
      +-- Major Knowledge
      |
      +-- School Offering
      |
      +-- Admission History
      |
      +-- Student Experience
```

Each layer keeps its own ownership.

## Major Identity

Every major must resolve through a stable identity:

- major code
- standard name
- aliases
- category
- version

Examples:

- 电气工程及其自动化
- 电气
- 080601

must resolve to the same major entity.

## Major Knowledge Layer

All majors must eventually support:

- 专业是什么
- 大学学什么
- 主要课程
- 毕业做什么
- 就业方向
- 适合学生
- 注意事项

This layer explains the profession itself.

It does not contain:

- admission scores
- school ranking
- student comments

## School-Major Matching

The system must support all majors, not only demonstration majors.

A user asking:

“电气工程及其自动化怎么样？”

or

“机械电子工程怎么样？”

must follow the same resolution path:

major identity
→ knowledge
→ matching schools
→ historical admission
→ experience

## No Product Ownership

Forbidden:

AIPLuS owning major explanations.
Tongxue owning major explanations.
ln-rank owning major explanations.

Products may present knowledge but do not create another source.

## Migration Requirement

Before merge:

1. Identify existing major owners.
2. Connect canonical major identity.
3. Migrate one complete vertical flow.
4. Add verification preventing duplicate ownership.

The first example major is only a test fixture, not the product boundary.

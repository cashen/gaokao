# PR192 Architecture Audit v001

## Purpose

Before product integration, verify that Human Copy Foundation and Major Knowledge Foundation change system ownership rather than only adding documentation.

## Current finding

The foundation must not become another isolated content source.

The canonical direction is:

- major knowledge owns professional facts;
- admission data owns scores and ranks;
- experience layer owns student feedback and campus feelings;
- product surfaces consume shared owners.

## Integration gate

A product module is considered migrated only when:

1. It reads major knowledge through the shared owner.
2. It does not maintain duplicate major explanation text.
3. It keeps admission and experience layers separated.
4. User-visible copy follows Human Copy rules.

## Migration order

1. Audit existing owners.
2. Identify duplicate knowledge.
3. Add adapter at canonical boundary.
4. Migrate one product flow.
5. Remove duplicate ownership.

## Non-goal

This PR does not change admission algorithms or ranking logic.

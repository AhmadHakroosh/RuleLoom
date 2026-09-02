# RuleLoom language semantics v1

This specification defines the implementation-independent semantics for canonical RuleLoom JSON rule constructs. The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative.

Every normative example in this document references an executable conformance fixture in [../../tests/fixtures/conformance/language-semantics-v1.json](../../tests/fixtures/conformance/language-semantics-v1.json).

## Terminology

- A rule set is an ordered JSON document containing zero or more rules and optional metadata.
- A rule is a JSON object with an identifier, a condition expression, and zero or more proposed actions.
- An expression is JSON data evaluated to a value state and an outcome state.
- A fact is named input data supplied by the evaluation host.
- A parameter is named configuration data supplied with a rule or rule set.
- A literal is a JSON scalar, array, or object embedded directly in an expression.
- An operator is a named, deterministic semantic operation such as equality, numeric comparison, membership, `all`, `any`, or `not`.
- A proposed action is JSON data emitted when a rule matches.
- An outcome is one of `matched`, `notMatched`, `indeterminate`, or `error`.
- A diagnostic is structured implementation output that explains invalid input, missing data, operator errors, resolver errors, or extension handling.
- A trace is an ordered explanation of evaluation steps and intermediate outcomes.
- An execution plan is an immutable implementation artifact derived from validated rule data.

## Data model

RuleLoom rules are JSON data. A rule document MUST NOT contain executable functions, host-language source code, promises, object references, or host callbacks. Implementations MUST interpret only JSON values: object, array, string, number, boolean, and `null`.

JSON object member order MUST NOT affect semantic equality or expression outcomes. Rule set order and explicit action order do affect deterministic output ordering as defined below.

## Expression forms

Canonical expression objects MUST contain exactly one primary operator key unless a future approved schema version defines otherwise. Auxiliary keys such as `path` MAY appear only where that primary expression form defines them.

### Literals

A literal expression embeds a JSON value:

```json
{ "literal": 42 }
```

Fixture: `EX-LITERAL-001`.

### Facts

A fact expression reads named input data and MAY include a JSON Pointer path:

```json
{ "fact": "order", "path": "/total" }
```

Fixture: `EX-FACT-001`.

If the fact name is not supplied by the host, the value state is `missingFact`. If the fact exists but the path cannot be resolved, the value state is `missingPath`. JSON `null` is a present value and MUST NOT be treated as missing.

Fixtures: `EX-MISSING-FACT-001`, `EX-MISSING-PATH-001`, `EX-NULL-001`.

### Parameters

A parameter expression reads named rule or rule-set configuration and MAY include a JSON Pointer path:

```json
{ "parameter": "limits", "path": "/minimumAge" }
```

Fixture: `EX-PARAMETER-001`.

Missing parameters use the `missingPath` value state unless a future approved schema distinguishes parameter absence more specifically.

### Boolean combinators

`all` evaluates operands left to right and short-circuits on the first operand that can determine the outcome. Empty `all` MUST evaluate to `matched`.

```json
{ "all": [{ "eq": [{ "fact": "country" }, { "literal": "CA" }] }] }
```

Fixtures: `EX-ALL-001`, `EX-EMPTY-ALL-001`, `EX-SHORT-CIRCUIT-ALL-001`.

`any` evaluates operands left to right and short-circuits on the first `matched` operand. Empty `any` MUST evaluate to `notMatched`.

Fixtures: `EX-ANY-001`, `EX-EMPTY-ANY-001`, `EX-SHORT-CIRCUIT-ANY-001`.

`not` accepts one operand. It maps `matched` to `notMatched`, `notMatched` to `matched`, and preserves `indeterminate` and `error`.

Fixture: `EX-NOT-001`.

### Comparisons

Comparison operands are expressions. Implementations MUST evaluate comparison operands left to right.

- `eq` performs strict JSON equality.
- `lt`, `lte`, `gt`, and `gte` perform numeric comparison only.
- `in` tests whether a candidate value is strictly equal to any element of an array collection.

Fixtures: `EX-EQ-001`, `EX-EQ-TYPE-001`, `EX-NUMERIC-001`, `EX-NUMERIC-TYPE-001`, `EX-IN-001`, `EX-IN-TYPE-001`.

## Equality and type behavior

Strict JSON equality MUST NOT use JavaScript coercion, truthiness, object identity, prototype behavior, or reference identity.

- Numbers compare by numeric value. `NaN`, `Infinity`, and `-Infinity` are not JSON numbers and MUST be rejected before semantic evaluation.
- Strings compare by Unicode code point sequence.
- Booleans compare by boolean value.
- `null` equals only `null`.
- Arrays compare by length and pairwise strict equality.
- Objects compare by having the same member names and strictly equal member values, independent of member order.
- Values of different JSON types are not equal.

Fixture: `EX-OBJECT-EQ-001`.

Numeric comparison with non-number operands MUST produce an operator error. Membership with a non-array collection MUST produce an operator error.

## Missing values and errors

RuleLoom distinguishes these states:

- `nullValue`: a present JSON `null` value.
- `missingPath`: a fact or parameter exists but the requested path does not.
- `missingFact`: the host did not provide the requested fact.
- `operatorError`: an operator received incompatible operands or malformed semantic input.
- `resolverError`: the host fact resolver failed before returning a JSON value.

Comparisons involving `missingPath` or `missingFact` MUST evaluate to `indeterminate` unless an enclosing expression short-circuits before evaluating them. Operator and resolver errors MUST evaluate to `error` unless an enclosing expression short-circuits before evaluating them.

Fixtures: `EX-MISSING-PATH-001`, `EX-MISSING-FACT-001`, `EX-OPERATOR-ERROR-001`, `EX-RESOLVER-ERROR-001`.

## Outcome propagation

The final rule condition outcome is one of:

- `matched`: the condition is true.
- `notMatched`: the condition is false.
- `indeterminate`: evaluation could not decide because required data was missing.
- `error`: evaluation failed because of an operator error, resolver error, invalid extension, or invalid semantic input.

### `all` propagation

| Operand outcomes                                                                          | Result          |
| ----------------------------------------------------------------------------------------- | --------------- |
| No operands                                                                               | `matched`       |
| Any evaluated operand is `notMatched`                                                     | `notMatched`    |
| No evaluated operand is `notMatched`; any evaluated operand is `error`                    | `error`         |
| No evaluated operand is `notMatched` or `error`; any evaluated operand is `indeterminate` | `indeterminate` |
| All operands are `matched`                                                                | `matched`       |

### `any` propagation

| Operand outcomes                                                                       | Result          |
| -------------------------------------------------------------------------------------- | --------------- |
| No operands                                                                            | `notMatched`    |
| Any evaluated operand is `matched`                                                     | `matched`       |
| No evaluated operand is `matched`; any evaluated operand is `error`                    | `error`         |
| No evaluated operand is `matched` or `error`; any evaluated operand is `indeterminate` | `indeterminate` |
| All operands are `notMatched`                                                          | `notMatched`    |

### `not` propagation

| Operand outcome | Result          |
| --------------- | --------------- |
| `matched`       | `notMatched`    |
| `notMatched`    | `matched`       |
| `indeterminate` | `indeterminate` |
| `error`         | `error`         |

## Rule results and proposed actions

Rules MUST be evaluated in rule-set order unless a future execution plan proves an equivalent deterministic order. The observable result order MUST match rule-set order.

A rule emits its proposed actions only when its condition outcome is `matched`. Proposed actions MUST retain the order declared in the rule. Rules with `notMatched`, `indeterminate`, or `error` outcomes MUST NOT emit proposed actions.

Fixtures: `EX-ACTION-ORDER-001`, `EX-RULE-ORDER-001`.

## Extension points

Future approved extensions MAY add operators or metadata namespaces. Unknown extensions MUST NOT be ignored silently. An implementation encountering an unknown required extension MUST produce `error`. An implementation encountering an unknown optional extension MUST produce a diagnostic and continue only if the extension is explicitly marked optional.

Fixtures: `EX-UNKNOWN-REQUIRED-EXTENSION-001`, `EX-UNKNOWN-OPTIONAL-EXTENSION-001`.

## Host-language independence

Implementations MUST NOT derive normative semantics from JavaScript object identity, JavaScript coercion, property enumeration quirks, Promise scheduling, host clock time, global mutable state, or network timing. Resolver scheduling MAY vary, but the final ordered results, proposed actions, diagnostics, and traces MUST be deterministic for the same JSON inputs and resolver outputs.

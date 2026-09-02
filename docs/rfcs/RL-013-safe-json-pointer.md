# RFC: RL-013 Safe JSON Pointer

## Ticket / Epic / Status

- Ticket: RL-013
- Epic: RL-E02
- Status: Accepted
- Target package: `@ruleloom/core`
- API status: Internal-only; no supported public API
- Security impact: Security boundary proposal for bounded, side-effect-free traversal of untrusted data
- Approved by: `Ahmad Hakroosh`
- Date: `September 02, 2026`
- Reference: RL-013

## 1 Problem statement

RuleLoom needs to resolve values from JSON-like input without inheriting unsafe or host-language-specific object behavior. A naive implementation can invoke getters, traverse prototype properties, treat array-like strings as valid indexes, allocate work proportional to a huge token, or expose prototype-pollution names. These behaviors make missing data ambiguous and can turn a read operation into code execution, mutation, denial of service, or privacy leakage.

This RFC defines a safe internal JSON Pointer facility. It uses RFC 6901 pointer syntax where practical, but restricts host semantics to own data properties and bounded traversal. The facility is for runtime and core implementation use only; it does not establish a supported public package API.

## 2 Goals

- Resolve JSON Pointer paths deterministically against JSON-like values.
- Preserve RFC 6901 token syntax and decoding, including the standard empty pointer and `~0` and `~1` escapes.
- Distinguish a present own property whose value is `undefined` from a missing segment.
- Read only own data descriptors and never invoke getter or setter functions.
- Reject unsafe property names: `__proto__`, `prototype`, and `constructor`.
- Define canonical array-index behavior, including rejection of leading zeros, `-`, and indexes above `2^32 - 2`.
- Bound pointer depth and token length before traversal can consume unbounded resources.
- Provide immutable precompiled pointers that can be reused concurrently.
- Return structured outcomes with stable diagnostic codes.
- Avoid mutation and avoid any dependency on the expression language.

## 3 Non-goals

- Providing a supported public API from `@ruleloom/core` or any other package.
- Implementing JSON Patch, JSON Merge Patch, or mutation operations.
- Invoking accessors, proxies, methods, callbacks, or user-provided expression functions.
- Defining expression-language syntax, coercion, truthiness, or missing-value semantics outside pointer resolution.
- Supporting arbitrary host objects as a portable data model.
- Guaranteeing protection from side effects already performed by a caller before pointer resolution begins.

## 4 Package and API placement

The implementation belongs in the internal portion of `@ruleloom/core`, owned by the runtime data-access boundary. Its symbols may be used by RuleLoom packages through reviewed internal imports, but they MUST NOT be exported as a supported public API or documented as a consumer-facing contract.

The internal shape should separate compilation from resolution:

- A compiler accepts a pointer string and returns either a structured invalid outcome or an immutable compiled pointer.
- A resolver accepts a compiled pointer and a root value and returns a structured outcome.
- The compiled representation contains decoded tokens and the limits used during compilation. It contains no references to a root object, descriptors, callbacks, or mutable resolver state.

The exact TypeScript names are implementation details. Stable outcome codes and the semantics in this RFC are the contract for internal callers and conformance tests.

## 5 Proposed behavior

### Pointer syntax

The facility follows RFC 6901 syntax:

- The empty string identifies the whole document.
- A non-empty pointer MUST begin with `/`.
- Each slash-delimited token is decoded by replacing `~1` with `/` and `~0` with `~`, in that order.
- Any `~` not followed by `0` or `1` is invalid and produces `POINTER_INVALID_ESCAPE`.
- A pointer that does not begin with `/` produces `POINTER_INVALID_SYNTAX`.
- Decoding MUST occur during compilation, before a compiled pointer is shared.

The RFC 6901 examples remain normative for syntax and decoding:

| Document member | Pointer                     | Decoded token |
| --------------- | --------------------------- | ------------- |
| `""`            | `/a~1b`                     | `a/b`         |
| `"c%d"`         | `/m~0n`                     | `m~n`         |
| `"e^f"`         | `/e^f`                      | `e^f`         |
| `"g\\h"`        | `/g\\h`                     | `g\\h`        |
| `"i\|j"`        | `/i\|j`                     | `i\|j`        |
| `"k\"l"`        | `/k\"l`                     | `k\"l`        |
| `" "`           | slash followed by one space | one space     |
| `"m~n"`         | `/m~0n`                     | `m~n`         |

### Present undefined

An own data property is present when `Object.getOwnPropertyDescriptor(value, token)` returns a descriptor, even when the descriptor value is `undefined`. Such a segment succeeds and yields `undefined`. Absence of a descriptor produces `POINTER_MISSING_SEGMENT`.

Inherited properties are never considered present. Presence MUST be determined by own descriptors rather than `in`, ordinary property reads, or prototype walking.

### Object traversal

For an object-like current value, traversal examines the next decoded token as an own property descriptor. A data descriptor is readable and yields its `value`. A missing descriptor produces `POINTER_MISSING_SEGMENT`. The resolver MUST NOT invoke ordinary property access, `hasOwnProperty` methods supplied by the input, or any inherited behavior.

The implementation MUST use `Object.getOwnPropertyDescriptor` for this decision. Proxy behavior is outside the portable data model; if the host exposes a proxy, the implementation MUST treat any trap-induced exception as `POINTER_ACCESS_FAILURE` rather than retrying through another access path.

### Getter/setter properties

If the own descriptor has a `get` or `set` field, it is an accessor descriptor. Accessors are never invoked, including when only a getter exists or when a setter exists without a getter. Encountering an accessor property produces `POINTER_ACCESSOR_PROPERTY` and does not return the accessor's value.

### Unsafe tokens

After decoding, the exact tokens `__proto__`, `prototype`, and `constructor` are unsafe at every traversal position. They produce `POINTER_UNSAFE_TOKEN`, regardless of whether an own data descriptor exists. Escaped spellings that decode to one of these names are equally unsafe.

## 6 Array-index semantics and max 2^32-2

When the current value is an array, the next token is interpreted as an array index only if it is canonical:

- `0` is valid.
- A positive index matches `[1-9][0-9]*`.
- `-` is invalid. It is not an append marker.
- Leading-zero forms such as `00` and `01` are invalid.
- Numeric tokens greater than `2^32 - 2` are invalid.
- A token that is not canonical array-index syntax produces `POINTER_INVALID_ARRAY_INDEX`.

The maximum accepted index is `2^32 - 2` (4294967294). `2^32 - 1` and larger values are rejected even if an own property with that string name exists. An accepted but absent index produces `POINTER_MISSING_SEGMENT`. Array traversal still uses an own data descriptor, so a hole is not the same as an own property containing `undefined`.

This array rule applies to arrays only. Non-array objects use ordinary decoded property names, subject to unsafe-token and descriptor rules.

## 7 Sparse arrays

Sparse arrays are traversed without filling holes, enumerating the array, or reading inherited values. An index within the permitted range succeeds only when its own descriptor exists. A hole therefore produces `POINTER_MISSING_SEGMENT`, while an explicitly assigned `undefined` succeeds as `present: true` with value `undefined`.

The resolver MUST not use iteration, spread, serialization, or length-based allocation to determine presence. Tests MUST cover leading and trailing holes, inherited numeric properties, and an own `undefined` element.

## 8 Scalar traversal

If a non-root segment remains after the current value is a scalar, traversal stops with `POINTER_SCALAR_TRAVERSAL`. Scalars include `null`, `undefined`, strings, numbers, booleans, bigints, and symbols. A pointer with no segments succeeds for any root value, including a scalar or `undefined`.

Strings MUST NOT be treated as array-like containers, and primitive boxing MUST NOT make their properties traversable. A missing segment on an object is therefore distinct from attempting to traverse beyond a scalar.

## 9 Complexity limits

Compilation and resolution MUST enforce limits before performing proportional work:

- Default maximum pointer depth: 64 tokens.
- Default maximum decoded token length: 1024 characters.
- Hard maximum pointer depth: 1024 tokens.
- Hard maximum decoded token length: 65536 characters.

Configured limits MUST be positive integers within the hard ceilings. Exceeding the configured depth produces `POINTER_DEPTH_EXCEEDED`; exceeding the configured decoded token length produces `POINTER_TOKEN_TOO_LONG`. A caller MUST NOT be able to configure a limit above the hard ceiling. Implementations SHOULD reject a token while decoding it rather than constructing an unbounded decoded token.

The limits bound compilation and traversal work. They do not promise a bound on host operations performed by a hostile proxy; proxies are not valid portable input and are handled as access failures as described above.

## 10 Precompiled pointers

Precompiled pointers contain an immutable sequence of decoded tokens and immutable effective limits. Compilation validates syntax, escapes, unsafe tokens, token lengths, and depth once. Resolution MUST NOT mutate the compiled pointer, its tokens, or caller-provided data.

The same compiled pointer MAY be resolved against different roots and MAY be used concurrently. Resolver state, including the current token position and current value, MUST be local to each invocation. A failed resolution MUST NOT poison or partially alter a compiled pointer. Implementations SHOULD freeze the representation or use an equivalent type-level and runtime immutability guarantee.

## 11 Structured outcomes

Every compile or resolve operation returns a structured outcome rather than relying on thrown control flow for expected pointer conditions. Successful resolution identifies that the value is present and carries the value, including `undefined`. Failure carries exactly one stable code and enough non-sensitive context for diagnostics without embedding the traversed data.

The stable codes are:

- `POINTER_INVALID_SYNTAX`: Pointer is not empty and does not begin with `/`, or otherwise violates pointer structure.
- `POINTER_INVALID_ESCAPE`: A `~` escape is not followed by `0` or `1`.
- `POINTER_DEPTH_EXCEEDED`: Pointer depth exceeds the effective configured limit.
- `POINTER_TOKEN_TOO_LONG`: A decoded token exceeds the effective configured length.
- `POINTER_UNSAFE_TOKEN`: Decoded token is `__proto__`, `prototype`, or `constructor`.
- `POINTER_INVALID_ARRAY_INDEX`: Array token is non-canonical, is `-`, has leading zeros, or exceeds `2^32 - 2`.
- `POINTER_MISSING_SEGMENT`: Required own data property or array element is absent.
- `POINTER_SCALAR_TRAVERSAL`: A segment remains after traversal reaches a scalar.
- `POINTER_ACCESSOR_PROPERTY`: The selected own property is an accessor descriptor.
- `POINTER_ACCESS_FAILURE`: Descriptor access failed, including an exception from a proxy `getOwnPropertyDescriptor` trap.

Error messages, token positions, and internal metadata may evolve, but these codes MUST remain stable. Expected outcomes MUST NOT contain the original object, accessor function, secret value, or a full pointer when that could disclose sensitive path data.

## 12 Compatibility

This is a new internal facility and establishes no supported public API. It is intentionally stricter than generic JavaScript property access and than JSON Pointer implementations that support arbitrary host objects. RFC 6901 document and token syntax remains compatible for ordinary JSON object and array data, while safe host semantics reject accessors, unsafe names, non-canonical array tokens, and out-of-range indexes.

Any future change to the listed outcomes, array rules, descriptor behavior, limits, or token decoding requires a new RFC and compatibility analysis. The implementation MUST NOT silently fall back to unsafe property access for compatibility.

## 13 Security and privacy

The primary threat model is untrusted rule input and untrusted data presented to a runtime. Descriptor-only reads prevent getters and setters from executing during lookup and avoid inherited prototype traversal. Unsafe-token rejection reduces prototype-pollution and constructor-based escape paths. No operation mutates the root, intermediate objects, arrays, or compiled pointer.

Bounded depth, token length, and array-index parsing reduce resource-exhaustion opportunities from pathological pointers. Numeric parsing MUST avoid precision loss when deciding whether an index exceeds `2^32 - 2`; length and lexical checks may reject values before conversion.

Pointer failures MUST avoid logging resolved values or automatically copying input data into diagnostics. Callers are responsible for applying their own data-classification policy to pointer strings, because paths themselves can contain sensitive names. Security regression tests MUST verify that `__proto__`, `prototype`, and `constructor` are rejected in plain and escaped forms, accessors are not invoked, descriptor access exceptions return `POINTER_ACCESS_FAILURE` without exposing error or value details, inherited properties are ignored, and no mutation occurs.

## 14 Migration/deprecation

No migration or deprecation is required because this proposal introduces no supported public API and no existing behavior is being replaced. Internal callers that currently use direct property access MUST migrate to the safe facility before relying on it for untrusted data. Any later attempt to expose it publicly requires a separate API review, documentation, versioning decision, and human approval.

## 15 Alternatives

- Use ordinary JavaScript property access: rejected because it can invoke accessors and traverse inherited or unsafe properties.
- Use `in` or `hasOwnProperty`: rejected because the former includes inherited properties and the latter can be shadowed or invoke host behavior; descriptor inspection is the required primitive.
- Adopt a general JSON Pointer package unchanged: rejected because package behavior may permit host objects, accessors, non-canonical array tokens, or unbounded work.
- Use JSON Patch semantics: rejected because this facility is read-only and must not mutate data or interpret `-` as append.
- Make the pointer part of the expression language: rejected because pointer resolution is an internal data-access primitive and must remain independent of expression-language semantics.

## 16 Rollout

After human approval, implement the facility inside `@ruleloom/core`, add focused unit and conformance coverage, and wire only approved internal call sites. The rollout MUST preserve the no-public-export boundary. RFC 6901 vectors, security regressions, sparse arrays, huge indexes, configured and hard limits, and concurrent precompiled resolution must pass before dependent runtime work is accepted.

A benchmark comparing direct descriptor traversal with the compiled path may be recorded for engineering context, but benchmark results are non-gating and MUST NOT replace correctness, security, or limit checks.

## 17 Rollback

Rollback is reverting the implementation and removing internal call sites that depend on it before release. Because the proposal does not change a public API or persisted data, rollback does not require data migration. Any rollback caused by a security regression MUST preserve the failing regression as a test and must be reviewed under [../governance/human-approvals.md](../governance/human-approvals.md) when the regression affects a security boundary.

## 18 Test strategy

Tests MUST cover:

- RFC 6901 vectors, including the empty pointer, `/a~1b`, and `/m~0n`.
- Invalid syntax and invalid escapes, including malformed and repeated `~` forms.
- Present own `undefined` versus a missing own segment.
- Own data descriptors, inherited properties, and properties shadowed by input-provided methods.
- Getters and setters that would fail the test if invoked, returning `POINTER_ACCESSOR_PROPERTY` without invocation.
- A proxy descriptor trap that throws, returning `POINTER_ACCESS_FAILURE` without throwing or exposing error details.
- Plain and escaped unsafe tokens: `__proto__`, `prototype`, and `constructor`.
- Canonical array indexes, leading zeros, `-`, `2^32 - 2`, `2^32 - 1`, and very large numeric tokens.
- Sparse arrays, holes, inherited numeric properties, and own `undefined` elements.
- Scalar traversal for `null`, `undefined`, strings, numbers, booleans, bigints, and symbols.
- Default limits, custom limits within hard ceilings, hard-ceiling rejection, depth overflow, and token overflow during decoding.
- Immutable compiled tokens, reuse across roots, failed resolutions, and concurrent resolution calls.
- No mutation of roots, intermediate objects, arrays, or compiled pointers.
- Stable structured codes and absence of sensitive values from failure outcomes.
- A non-gating benchmark for compiled versus uncompiled pointer use.

Tests SHOULD run in the package's existing unit-test harness and MUST avoid relying on implementation-specific error message text. Conformance fixtures SHOULD make the expected presence flag, value category, and stable failure code explicit.

## 19 Approval requirements

This RFC changes a security boundary and defines runtime-visible internal semantics. It requires human approval before implementation under [../governance/human-approvals.md](../governance/human-approvals.md). Approval evidence MUST identify the ticket, approver role, date, and exact reviewed artifact or commit, and MUST remain outside the reviewed Git tree as required by the delivery workflow.

- Status: APPROVED
- Approved by: Ahmad Hakroosh
- Approver role: human owner
- Date: September 02, 2026
- Reference: docs/rfcs/RL-013-safe-json-pointer.md (SHA-256: 69078fdcb5d782b32b8026a3e8274a7639dfa415f5f0af6b315274b0e86f4b56)

## 20 Decision summary

Adopt an internal-only safe JSON Pointer facility in `@ruleloom/core`. It uses RFC 6901 syntax with restricted host semantics: immutable decoded compiled tokens, descriptor-only own-property reads, no accessor invocation, rejection of `__proto__`, `prototype`, and `constructor`, canonical bounded array indexes through `2^32 - 2`, distinct scalar traversal and missing-segment outcomes, and default limits of depth 64 and token length 1024 within hard ceilings of depth 1024 and token length 65536. The facility performs no mutation, has no expression-language dependency, exposes no supported public API, and reports the stable structured codes defined in this RFC.

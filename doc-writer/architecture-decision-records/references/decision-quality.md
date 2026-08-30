# ADR decision quality

Load this reference when evidence is uncertain, options need comparison, or future review conditions matter. It is optional for a clear, concise decision.

## Evidence labels

Use whatever labels help readers distinguish:

- **Observed:** directly inspected code, behavior, measurement, or contractual fact;
- **Sourced:** an authoritative external document or standard;
- **Estimated:** a model with visible assumptions or range;
- **Assumed:** not yet validated.

Do not turn an estimate or assumption into fact by placing it in a table. Add an owner or validation path only when someone has actually accepted that responsibility or the repository requires it.

## Option comparison

Compare only genuine alternatives and only against criteria that affected the choice. Prose is often enough. A table or weighted matrix can help when there are many material dimensions, but it must not replace judgment or override a hard constraint. Define weights and scores if they are used, and disclose sensitivity when a small assumption change reverses the outcome.

The status quo belongs only when it remained a viable choice. A rejected idea that no one could reasonably implement is not useful analysis.

## Consequences and uncertainty

Record the positive and negative effects that follow from adoption. Include migration, operational burden, security/data effects, new failure modes, compatibility, cost, or reversibility only when germane.

When an important assumption may change, state a concrete observation that would justify review—for example a dependency lifecycle event, an operating-limit breach, a regulatory change, or evidence that a reliability assumption failed. A revisit trigger is optional when the decision has no meaningful uncertain condition.

## Supersession integrity

Treat supersession as a relationship between historical records, not permission to rewrite the old decision. The new ADR names the old ADR it supersedes. If local convention supports reciprocal lifecycle links, the old ADR points to the new one; if lifecycle is maintained in an index instead, update that index rather than inventing a new field.

Check that both targets resolve, there is no accidental cycle, and statuses do not imply that incompatible decisions govern the same scope. A proposed replacement can say what it would supersede, but must not mark the old ADR superseded. After real acceptance, use the repository's convention: it may change the old lifecycle status, or retain the original accepted status as historical metadata while adding an explicit superseded relation. In either case, preserve the old date, context, decision, rationale, and consequences.

## Compact evals

- **Positive:** An authorized new ADR links to the old ADR, the old ADR receives the convention-supported `Superseded by` link, their current lifecycle meaning is consistent, and the old decision text remains intact.
- **Negative:** A proposed ADR marks the old ADR superseded, leaves no reciprocal link despite a local bidirectional convention, and rewrites the old rationale to match the new choice.

## Source note

The concise ADR shape and optional metadata approach were informed by [adr/madr at `ba75bb1`](https://github.com/adr/madr/tree/ba75bb1b20d42af5746b246ad348c202419ae681) (MIT OR CC0-1.0). The reciprocal supersession check is independently worded from Log4brains' implementation in [`packages/core/src/adr/application/command-handlers/SupersedeAdrCommandHandler.ts` at `17e32021`](https://github.com/thomvaill/log4brains/blob/17e32021a8c5130386f17e921d4efa6da7709a66/packages/core/src/adr/application/command-handlers/SupersedeAdrCommandHandler.ts) and its paired fixtures [`20201028-superseded-adr.md`](https://github.com/thomvaill/log4brains/blob/17e32021a8c5130386f17e921d4efa6da7709a66/packages/core/integration-tests/ro-project/docs/adr/20201028-superseded-adr.md) and [`20201029-superseder.md`](https://github.com/thomvaill/log4brains/blob/17e32021a8c5130386f17e921d4efa6da7709a66/packages/core/integration-tests/ro-project/docs/adr/20201029-superseder.md) (Apache-2.0). These references do not make a backlink or tool mandatory where local convention omits it.

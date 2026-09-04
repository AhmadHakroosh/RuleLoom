import {
  typeCheckRuleSetDocument,
  type BoundRuleSetDocument,
  type RegistryDescriptor,
  type TypeCheckOptions,
} from "@ruleloom/compiler";

declare const document: BoundRuleSetDocument;

const validDescriptor: RegistryDescriptor = {
  id: "eq",
  version: "1",
  inputTypes: ["unknown", "unknown"],
  outputType: "boolean",
  arity: 2,
  pure: true,
  costClass: "constant",
  async: false,
};

const validOptions: TypeCheckOptions = { operators: [validDescriptor] };
typeCheckRuleSetDocument(document, validOptions);

// @ts-expect-error inputTypes must be readonly string[], not number[].
const invalidInputTypes: RegistryDescriptor["inputTypes"] = [1, 2];

// @ts-expect-error arity must be number | { min; max? }, not a string.
const invalidArity: RegistryDescriptor["arity"] = "many";

// @ts-expect-error pure must be a boolean, not a callback.
const invalidPure: RegistryDescriptor["pure"] = () => true;

// @ts-expect-error operators must be RegistryDescriptor[], not plain objects.
const invalidOperators: TypeCheckOptions["operators"] = [{}];

void invalidInputTypes;
void invalidArity;
void invalidPure;
void invalidOperators;

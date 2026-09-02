import { readFile } from "node:fs/promises";

const shaPattern = /^[0-9a-f]{40}$/u;
const requirementIdPattern = /^REQ-[0-9]+$/u;
const criterionIdPattern = /^AC-[0-9]+$/u;
const findingIdPattern = /^F-[0-9]+$/u;

const defaultFiles = [
  "tests/fixtures/delivery/valid-requirements.json",
  "tests/fixtures/delivery/valid-design.json",
  "tests/fixtures/delivery/valid-delivery-packet.json",
  "tests/fixtures/delivery/valid-review.json",
];

const filesToValidate =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultFiles;
const errors = [];

const validateStringArray = (value, label, filePath) => {
  if (!Array.isArray(value)) {
    errors.push(`${filePath}: ${label} must be an array`);
    return;
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      errors.push(`${filePath}: ${label} entries must be non-empty strings`);
      return;
    }
  }
};

const validateRequirements = (data, filePath) => {
  if (!data || typeof data !== "object") {
    errors.push(`${filePath}: requirements contract must be an object`);
    return;
  }

  if (data.schemaVersion !== "1.0") {
    errors.push(`${filePath}: schemaVersion must be 1.0`);
  }

  if (!data.ticket || typeof data.ticket !== "object") {
    errors.push(`${filePath}: ticket is required`);
  } else {
    if (
      typeof data.ticket.provider !== "string" ||
      !data.ticket.provider.trim()
    ) {
      errors.push(`${filePath}: ticket.provider is required`);
    }
    if (typeof data.ticket.id !== "string" || !data.ticket.id.trim()) {
      errors.push(`${filePath}: ticket.id is required`);
    }
    if (
      typeof data.ticket.url !== "string" ||
      !/^https?:\/\//u.test(data.ticket.url)
    ) {
      errors.push(`${filePath}: ticket.url must be an http(s) URL`);
    }
  }

  if (
    typeof data.objective !== "string" ||
    data.objective.trim().length === 0
  ) {
    errors.push(`${filePath}: objective is required`);
  }

  if (!data.scope || typeof data.scope !== "object") {
    errors.push(`${filePath}: scope is required`);
  } else {
    validateStringArray(data.scope.in, "scope.in", filePath);
    validateStringArray(data.scope.out ?? [], "scope.out", filePath);
  }

  if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
    errors.push(`${filePath}: requirements must be a non-empty array`);
  } else {
    for (const requirement of data.requirements) {
      if (!requirement || typeof requirement !== "object") {
        errors.push(`${filePath}: each requirement must be an object`);
        continue;
      }
      if (!requirementIdPattern.test(requirement.id ?? "")) {
        errors.push(`${filePath}: requirement id must match REQ-####`);
      }
      if (!["functional", "nonfunctional"].includes(requirement.kind)) {
        errors.push(
          `${filePath}: requirement.kind must be functional or nonfunctional`,
        );
      }
    }
  }

  if (
    !Array.isArray(data.acceptanceCriteria) ||
    data.acceptanceCriteria.length === 0
  ) {
    errors.push(`${filePath}: acceptanceCriteria must be a non-empty array`);
  } else {
    for (const criterion of data.acceptanceCriteria) {
      if (!criterion || typeof criterion !== "object") {
        errors.push(`${filePath}: each acceptance criterion must be an object`);
        continue;
      }
      if (!criterionIdPattern.test(criterion.id ?? "")) {
        errors.push(`${filePath}: acceptance criterion id must match AC-####`);
      }
      if (
        !Array.isArray(criterion.requirementIds) ||
        criterion.requirementIds.length === 0
      ) {
        errors.push(
          `${filePath}: acceptance criterion requirementIds must be non-empty`,
        );
      }
    }
  }

  if (!Array.isArray(data.ambiguities)) {
    errors.push(`${filePath}: ambiguities must be an array`);
  }
};

const validateDesign = (data, filePath) => {
  if (!data || typeof data !== "object") {
    errors.push(`${filePath}: design contract must be an object`);
    return;
  }

  if (data.schemaVersion !== "1.0") {
    errors.push(`${filePath}: schemaVersion must be 1.0`);
  }
  if (
    typeof data.requirementsRef !== "string" ||
    data.requirementsRef.trim().length === 0
  ) {
    errors.push(`${filePath}: requirementsRef is required`);
  }
  if (typeof data.summary !== "string" || data.summary.trim().length === 0) {
    errors.push(`${filePath}: summary is required`);
  }
  if (!Array.isArray(data.decisions) || data.decisions.length === 0) {
    errors.push(`${filePath}: decisions must be a non-empty array`);
  }
  validateStringArray(data.affectedComponents, "affectedComponents", filePath);
  validateStringArray(data.testStrategy, "testStrategy", filePath);
  if (typeof data.rollout !== "string" || data.rollout.trim().length === 0) {
    errors.push(`${filePath}: rollout is required`);
  }
  if (typeof data.rollback !== "string" || data.rollback.trim().length === 0) {
    errors.push(`${filePath}: rollback is required`);
  }
};

const validateDeliveryPacket = (data, filePath) => {
  if (!data || typeof data !== "object") {
    errors.push(`${filePath}: delivery packet must be an object`);
    return;
  }

  if (data.schemaVersion !== "1.0") {
    errors.push(`${filePath}: schemaVersion must be 1.0`);
  }
  if (typeof data.ticketId !== "string" || data.ticketId.trim().length === 0) {
    errors.push(`${filePath}: ticketId is required`);
  }
  if (typeof data.baseSha !== "string" || !shaPattern.test(data.baseSha)) {
    errors.push(`${filePath}: baseSha must be a 40-character hexadecimal SHA`);
  }
  if (typeof data.headSha !== "string" || !shaPattern.test(data.headSha)) {
    errors.push(`${filePath}: headSha must be a 40-character hexadecimal SHA`);
  }
  if (
    typeof data.requirementsRef !== "string" ||
    data.requirementsRef.trim().length === 0
  ) {
    errors.push(`${filePath}: requirementsRef is required`);
  }
  if (
    typeof data.designRef !== "string" ||
    data.designRef.trim().length === 0
  ) {
    errors.push(`${filePath}: designRef is required`);
  }
  if (
    typeof data.changeSummary !== "string" ||
    data.changeSummary.trim().length === 0
  ) {
    errors.push(`${filePath}: changeSummary is required`);
  }
  validateStringArray(data.filesChanged, "filesChanged", filePath);
  if (
    !Array.isArray(data.acceptanceEvidence) ||
    data.acceptanceEvidence.length === 0
  ) {
    errors.push(`${filePath}: acceptanceEvidence must be a non-empty array`);
  }
  if (!Array.isArray(data.checks) || data.checks.length === 0) {
    errors.push(`${filePath}: checks must be a non-empty array`);
  }
};

const validateReview = (data, filePath) => {
  if (!data || typeof data !== "object") {
    errors.push(`${filePath}: review contract must be an object`);
    return;
  }

  if (data.schemaVersion !== "1.0") {
    errors.push(`${filePath}: schemaVersion must be 1.0`);
  }
  if (
    typeof data.reviewedHeadSha !== "string" ||
    !shaPattern.test(data.reviewedHeadSha)
  ) {
    errors.push(
      `${filePath}: reviewedHeadSha must be a 40-character hexadecimal SHA`,
    );
  }
  if (!Array.isArray(data.reviewers) || data.reviewers.length < 3) {
    errors.push(`${filePath}: reviewers must contain at least 3 entries`);
  }
  if (!["approve", "request-changes"].includes(data.verdict)) {
    errors.push(`${filePath}: verdict must be approve or request-changes`);
  }
  if (!Array.isArray(data.findings)) {
    errors.push(`${filePath}: findings must be an array`);
  } else {
    for (const finding of data.findings) {
      if (!finding || typeof finding !== "object") {
        errors.push(`${filePath}: each finding must be an object`);
        continue;
      }
      if (!findingIdPattern.test(finding.id ?? "")) {
        errors.push(`${filePath}: finding id must match F-####`);
      }
    }
  }
};

for (const filePath of filesToValidate) {
  try {
    const content = await readFile(filePath, "utf8");
    const data = JSON.parse(content);

    if (Array.isArray(data.requirements)) {
      validateRequirements(data, filePath);
    } else if (Array.isArray(data.decisions)) {
      validateDesign(data, filePath);
    } else if (Array.isArray(data.acceptanceEvidence)) {
      validateDeliveryPacket(data, filePath);
    } else if (Array.isArray(data.reviewers)) {
      validateReview(data, filePath);
    } else {
      errors.push(`${filePath}: unable to infer the delivery contract type`);
    }
  } catch (error) {
    errors.push(
      `${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Delivery contract validation failed:");
  for (const failure of errors) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Validated delivery contract instances");

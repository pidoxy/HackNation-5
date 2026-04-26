export const parseHypothesisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["domain", "readiness", "parsedFields"],
  properties: {
    domain: { type: "string" },
    readiness: { type: "string" },
    parsedFields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
      minItems: 4,
    },
  },
} as const;

export const experimentPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "experimentId",
    "domain",
    "status",
    "qualityBar",
    "parsedFields",
    "noveltySignal",
    "references",
    "protocol",
    "materials",
    "budget",
    "timeline",
    "validation",
    "reviewFeedback",
    "signals",
  ],
  properties: {
    title: { type: "string" },
    experimentId: { type: "string" },
    domain: { type: "string" },
    status: { type: "string" },
    qualityBar: { type: "string" },
    parsedFields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
    },
    noveltySignal: {
      type: "string",
      enum: ["not found", "similar work exists", "exact match found"],
    },
    references: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "source", "doi", "note"],
        properties: {
          type: {
            type: "string",
            enum: ["similarity", "protocol", "supplier", "conflict"],
          },
          title: { type: "string" },
          source: { type: "string" },
          doi: { type: "string" },
          note: { type: "string" },
        },
      },
      minItems: 1,
      maxItems: 5,
    },
    protocol: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step", "title", "detail", "time"],
        properties: {
          step: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          time: { type: "string" },
        },
      },
      minItems: 3,
    },
    materials: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "supplier",
          "catalogNumber",
          "quantity",
          "estimatedCost",
        ],
        properties: {
          name: { type: "string" },
          supplier: { type: "string" },
          catalogNumber: { type: "string" },
          quantity: { type: "string" },
          estimatedCost: { type: "string" },
        },
      },
      minItems: 4,
    },
    budget: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "amount", "note"],
        properties: {
          item: { type: "string" },
          amount: { type: "string" },
          note: { type: "string" },
        },
      },
      minItems: 4,
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "action"],
        properties: {
          phase: { type: "string" },
          action: { type: "string" },
        },
      },
      minItems: 3,
    },
    validation: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
    },
    reviewFeedback: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "issue", "impact"],
        properties: {
          section: { type: "string" },
          issue: { type: "string" },
          impact: { type: "string" },
        },
      },
      minItems: 2,
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "hint"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          hint: { type: "string" },
        },
      },
      minItems: 3,
      maxItems: 3,
    },
  },
} as const;

export const sectionSchemas = {
  protocol: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["step", "title", "detail", "time"],
      properties: {
        step: { type: "string" },
        title: { type: "string" },
        detail: { type: "string" },
        time: { type: "string" },
      },
    },
    minItems: 3,
  },
  materials: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["name", "supplier", "catalogNumber", "quantity", "estimatedCost"],
      properties: {
        name: { type: "string" },
        supplier: { type: "string" },
        catalogNumber: { type: "string" },
        quantity: { type: "string" },
        estimatedCost: { type: "string" },
      },
    },
    minItems: 4,
  },
  budget: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["item", "amount", "note"],
      properties: {
        item: { type: "string" },
        amount: { type: "string" },
        note: { type: "string" },
      },
    },
    minItems: 4,
  },
  timeline: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["phase", "action"],
      properties: {
        phase: { type: "string" },
        action: { type: "string" },
      },
    },
    minItems: 3,
  },
  validation: {
    type: "array",
    items: { type: "string" },
    minItems: 3,
  },
} as const;

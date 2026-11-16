import { validSave } from "./game";
import { learningDraftKey, validLearningDraft, initialLearningDraft } from "./learningDraft";

const lessonData = {
  blocks: [{ id: "hook" }, { id: "ex1" }],
  quiz: [{ id: "q1", kind: "single", options: ["a", "b"] }],
};
const trainerData = {
  tasks: [{ id: "t1", kind: "single", options: ["a", "b"] }],
};

describe("validSave", () => {
  test("accepts empty and partial saves", () => {
    expect(validSave({})).toBe(true);
    expect(validSave({ joules: 225, mistakes: ["a:b"], mistakeAt: { "a:b": "2026-11-09T10:00:00.000Z" } })).toBe(true);
    expect(validSave({ mistakes: ["t1"], mistakeAt: { "t1": { at: "2026-11-09T10:00:00.000Z", given: 2 } } })).toBe(true);
  });

  test("rejects broken shapes", () => {
    expect(validSave(null)).toBe(false);
    expect(validSave([])).toBe(false);
    expect(validSave("{bad json")).toBe(false);
    expect(validSave({ joules: "много" })).toBe(false);
    expect(validSave({ mistakes: "t1" })).toBe(false);
    expect(validSave({ mistakeAt: { t1: 123 } })).toBe(false);
    expect(validSave({ nickname: "x".repeat(29) })).toBe(false);
    expect(validSave({ avatar: "dragon" })).toBe(false);
  });

  test("ignores unknown future fields", () => {
    expect(validSave({ someFutureFlag: true, mistakes: [] })).toBe(true);
  });
});

describe("learningDraftKey", () => {
  test("stable for same content, changes with content", () => {
    const a = learningDraftKey("lesson", "slug", lessonData);
    expect(learningDraftKey("lesson", "slug", lessonData)).toBe(a);
    expect(learningDraftKey("lesson", "slug", { ...lessonData, quiz: [] })).not.toBe(a);
    expect(learningDraftKey("trainer", "slug", lessonData)).not.toBe(a);
  });
});

describe("validLearningDraft", () => {
  test("lesson draft round-trip", () => {
    const init = initialLearningDraft("lesson", lessonData);
    expect(validLearningDraft("lesson", lessonData, init)).toBe(true);
    expect(validLearningDraft("lesson", lessonData, { ...init, cardId: "nope" })).toBe(false);
  });

  test("trainer draft round-trip", () => {
    const init = initialLearningDraft("trainer", trainerData);
    expect(validLearningDraft("trainer", trainerData, init)).toBe(true);
    expect(validLearningDraft("trainer", trainerData, { ...init, taskId: "nope" })).toBe(false);
  });
});

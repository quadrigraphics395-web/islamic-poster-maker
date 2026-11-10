import assert from "node:assert/strict";
import test from "node:test";
import { clearTemplateEdit, getTemplateManagerValues, runTemplateAction } from "./templateManagerActions.js";

function createActionState() {
  const errors = [];
  const busyIds = [];
  return { errors, busyIds, setError: (value) => errors.push(value), setBusyId: (value) => busyIds.push(value) };
}

test("publishing saves the selected value, refreshes API state, then clears the edit buffer", async () => {
  const template = { id: "online-1", name: "Dua", category: "Faith", published: false };
  let editing = { [template.id]: { ...getTemplateManagerValues(template, {}), published: true } };
  let refreshedTemplate = template;
  let savedValues;
  const actionState = createActionState();

  const succeeded = await runTemplateAction(template, async () => {
    savedValues = getTemplateManagerValues(template, editing);
    refreshedTemplate = { ...template, ...savedValues, published: true };
  }, {
    ...actionState,
    onSuccess: () => { editing = clearTemplateEdit(editing, template.id); },
    onFailure: () => { editing = clearTemplateEdit(editing, template.id); },
  });

  assert.equal(succeeded, true);
  assert.equal(savedValues.published, true);
  assert.equal(getTemplateManagerValues(refreshedTemplate, editing).published, true);
  assert.equal(Object.hasOwn(editing, template.id), false);
  assert.deepEqual(actionState.errors, [""]);
  assert.deepEqual(actionState.busyIds, [template.id, null]);
});

test("saving metadata displays the refreshed API row rather than stale editor values", async () => {
  const template = { id: "online-2", name: "Old name", category: "Faith", published: false };
  let editing = { [template.id]: { ...getTemplateManagerValues(template, {}), name: "New name", category: "Dua" } };
  let refreshedTemplate = template;

  const succeeded = await runTemplateAction(template, async () => {
    const submitted = getTemplateManagerValues(template, editing);
    refreshedTemplate = { ...template, name: submitted.name, category: submitted.category };
  }, {
    setBusyId() {},
    setError() {},
    onSuccess: () => { editing = clearTemplateEdit(editing, template.id); },
    onFailure: () => { editing = clearTemplateEdit(editing, template.id); },
  });

  assert.equal(succeeded, true);
  assert.deepEqual(getTemplateManagerValues(refreshedTemplate, editing), {
    name: "New name",
    category: "Dua",
    description: "",
    featured: false,
    published: false,
  });
});

test("a failed publish shows an error and restores the last API state", async () => {
  const template = { id: "online-3", name: "Draft", category: "Faith", published: false };
  let editing = { [template.id]: { ...getTemplateManagerValues(template, {}), published: true } };
  const actionState = createActionState();

  const succeeded = await runTemplateAction(template, async () => {
    throw new Error("Publish request failed.");
  }, {
    ...actionState,
    onSuccess: () => { editing = clearTemplateEdit(editing, template.id); },
    onFailure: () => { editing = clearTemplateEdit(editing, template.id); },
  });

  assert.equal(succeeded, false);
  assert.deepEqual(actionState.errors, ["", "Publish request failed."]);
  assert.equal(getTemplateManagerValues(template, editing).published, false);
  assert.equal(Object.hasOwn(editing, template.id), false);
  assert.deepEqual(actionState.busyIds, [template.id, null]);
});

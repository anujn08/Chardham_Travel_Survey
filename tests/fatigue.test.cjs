const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let now = 0;
const task = { dataset: {} };
const field = { value: 'previous response' };
const page = { id: 'choice-page', style: {}, querySelectorAll: () => [task] };
const document = {
    addEventListener() {},
    getElementById: id => id === page.id ? page : id === '_fatigueMetrics' ? field : null,
    querySelectorAll: selector => selector === '.dce-task' ? [task] : [],
};
const context = vm.createContext({ document, console, Date: { now: () => now } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), context);
const run = code => vm.runInContext(code, context);
context.testPage = page;
context.testRadio = { name: 'main_haul_Kedarnath_Task1', closest: () => task };

// Failed validation must not close or count the page visit.
run(`pages = [testPage, {id: 'next-page'}]; currentTab = 0;
    validatePage = () => false; recordPageEnter('choice-page');`);
now = 10000;
assert.equal(run('nextPrev(1)'), false);
assert.equal(run('Object.keys(fatigueData.pageTimings).length'), 0);
now = 15000;
run(`validatePage = () => true; initializeSurveyTiming = () => {};
    handleFormSubmit = () => {}; showTab = () => {}; nextPrev(1);`);
assert.equal(run(`fatigueData.pageTimings['choice-page']`), 15);
// Once submitted, neither Back nor repeated forward clicks may resubmit.
let submissions = 0;
context.countSubmission = () => { submissions++; };
run('handleFormSubmit = countSubmission;');
assert.equal(run('nextPrev(-1)'), false);
assert.equal(run('nextPrev(1)'), false);
assert.equal(run('currentTab'), 1);
assert.equal(submissions, 0);
run(`recordPageExit('choice-page')`);
assert.equal(run(`fatigueData.pageTimings['choice-page']`), 15);

// Returning to a choice page preserves its active time, excluding time away.
now = 115000;
run(`recordPageEnter('choice-page')`);
now = 120000;
run('recordDceTaskTime(testRadio)');
assert.equal(run('fatigueData.dceTaskTimings[0].seconds'), 20);
now = 123000;
run('recordDceTaskTime(testRadio)');
assert.equal(run('fatigueData.dceTaskTimings[1].seconds'), 3);

// New-response flow clears all counters, hidden payload, and card timer state.
run(`form = {reset() {}}; resetDynamicSurveyState = () => {};
    clearValidationStyles = () => {}; assignChoiceBlock = () => {};
    handleTravelTypeChange = () => {}; renderTable = () => {};
    fatigueData.backNavigations = 2;`);
context.sessionStorage = { removeItem() {} };
context.window = { scrollTo() {} };
run('startNewResponse()');
assert.equal(run('JSON.stringify(fatigueData)'),
    '{"pageTimings":{},"backNavigations":0,"dceTaskTimings":[]}');
assert.equal(field.value, '');
assert.equal(task.dataset.taskStart, undefined);
assert.equal(task.dataset.taskElapsedMs, undefined);
run('injectFatigueFields()');
assert.equal(JSON.parse(field.value).totalSurveySeconds, 0);
assert.deepEqual(JSON.parse(field.value).dceTaskTimings, []);

// Rendering cards alone does not start a timer, and thank-you time is excluded.
assert.ok(!run(`generateTaskHTML({Dham: 'Kedarnath'}, 1, 'main_haul')`).includes('data-task-start'));
run(`recordPageEnter('page-7-thankyou')`);
assert.equal(run('_pageEnterTime'), null);
console.log('Fatigue regression checks passed.');

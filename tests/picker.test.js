const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(initial = []) {
  class Element {
    constructor() { this.children = []; this.style = {}; this.handlers = {}; }
    setAttribute() {}
    addEventListener(event, callback) { this.handlers[event] = callback; }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; }
    click() { return this.handlers.click(); }
  }
  const elements = Object.fromEntries(['pick', 'colors', 'empty', 'count', 'status'].map(id => [id, new Element()]));
  let stored = initial;
  let picked = '#aabbcc';
  let copied;
  const chrome = { storage: {
    local: {
      get: async () => ({ colors: stored }),
      set: async value => { stored = value.colors; }
    },
    onChanged: { addListener() {} }
  } };
  class EyeDropper { async open() { if (picked instanceof Error) throw picked; return { sRGBHex: picked }; } }
  const context = { document: { getElementById: id => elements[id], createElement: () => new Element() }, chrome,
    navigator: { clipboard: { writeText: async value => { copied = value; } } }, EyeDropper, window: { EyeDropper } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../picker.js'), 'utf8'), context);
  return { elements, stored: () => stored, copied: () => copied, pick: value => { picked = value; } };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('선택한 색을 저장하고 중복 없이 맨 위에 표시하며 복사와 삭제가 가능하다', async () => {
  const app = setup(['#112233', '#AABBCC']);
  await flush();
  await app.elements.pick.click();
  assert.deepEqual(Array.from(app.stored()), ['#AABBCC', '#112233']);
  assert.equal(app.elements.count.textContent, 2);
  assert.equal(app.elements.empty.hidden, true);
  await app.elements.colors.children[0].children[2].click();
  assert.equal(app.copied(), '#AABBCC');
  await app.elements.colors.children[0].children[3].click();
  assert.deepEqual(Array.from(app.stored()), ['#112233']);
});

test('선택을 취소해도 저장된 색상이 유지된다', async () => {
  const app = setup(['#112233']);
  await flush();
  const error = new Error('cancel');
  error.name = 'AbortError';
  app.pick(error);
  await app.elements.pick.click();
  assert.deepEqual(app.stored(), ['#112233']);
  assert.match(app.elements.status.textContent, /취소/);
  assert.equal(app.elements.pick.disabled, false);
});

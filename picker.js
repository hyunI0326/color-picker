const pickButton = document.getElementById('pick');
const list = document.getElementById('colors');
const empty = document.getElementById('empty');
const count = document.getElementById('count');
const status = document.getElementById('status');
let colors = [];

function render() {
  list.replaceChildren();
  count.textContent = colors.length;
  empty.hidden = colors.length > 0;
  for (const color of colors) {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.setAttribute('aria-hidden', 'true');
    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = color;
    const copy = document.createElement('button');
    copy.className = 'small-button';
    copy.type = 'button';
    copy.textContent = '복사';
    copy.setAttribute('aria-label', `${color} 복사`);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(color);
        status.textContent = `${color} 코드를 복사했어요.`;
      } catch {
        status.textContent = '복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.';
      }
    });
    const remove = document.createElement('button');
    remove.className = 'small-button';
    remove.type = 'button';
    remove.textContent = '삭제';
    remove.setAttribute('aria-label', `${color} 삭제`);
    remove.addEventListener('click', () => save(colors.filter(value => value !== color)));
    item.append(swatch, code, copy, remove);
    list.append(item);
  }
}

async function save(next) {
  try {
    await chrome.storage.local.set({ colors: next });
    colors = next;
    render();
    status.textContent = '저장했어요.';
  } catch {
    status.textContent = '저장하지 못했어요. 다시 시도해 주세요.';
  }
}

pickButton.addEventListener('click', async () => {
  if (!window.EyeDropper) {
    status.textContent = '이 브라우저에서는 스포이드를 지원하지 않아요.';
    return;
  }
  pickButton.disabled = true;
  status.textContent = '화면에서 색상을 선택하세요. Esc를 누르면 취소됩니다.';
  try {
    const result = await new EyeDropper().open();
    const color = result.sRGBHex.toUpperCase();
    await save([color, ...colors.filter(value => value !== color)]);
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? '색상 선택을 취소했어요.' : '색상을 선택하지 못했어요. 다시 시도해 주세요.';
  } finally {
    pickButton.disabled = false;
  }
});

chrome.storage.local.get('colors').then(result => {
  colors = Array.isArray(result.colors) ? result.colors : [];
  render();
  pickButton.disabled = false;
}).catch(() => {
  pickButton.disabled = true;
  status.textContent = '저장된 색상을 불러오지 못했어요. 창을 다시 열어 주세요.';
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.colors) {
    colors = Array.isArray(changes.colors.newValue) ? changes.colors.newValue : [];
    render();
  }
});

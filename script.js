/*
 * ЛР5. Обхід DOM-дерева сторінки викладача.
 * Автор: Костенко М.Т., група К24-2, 2026
 *
 * Ідея: усі вузли-елементи сторінки збираються у список у порядку обходу
 * дерева в глибину (pre-order). Користувач рухається по списку за допомогою
 * вікна-повідомлення. Кожен крок реалізовано через функції зворотного виклику
 * (callback): вікно не повертає відповідь, а викликає передану йому функцію.
 */

/* ---------- 1. Збирання вузлів дерева (рекурсивний обхід у глибину) ---------- */

/**
 * Обходить піддерево, починаючи з node, і для кожного елемента
 * викликає callback(element, depth).
 */
function traverse(node, depth, callback) {
  callback(node, depth);
  for (const child of node.children) {
    // службові вузли скрипта та вікна обходу не показуємо
    if (child.tagName === 'SCRIPT' || child.id === 'domDialog') continue;
    traverse(child, depth + 1, callback);
  }
}

function collectNodes() {
  const list = [];
  traverse(document.documentElement, 0, function (el, depth) {
    list.push({ el: el, depth: depth });
  });
  return list;
}

/* ---------- 2. Опис вузла для повідомлення ---------- */

function nodeName(el) {
  let name = el.tagName.toLowerCase();
  // службовий клас підсвічування в назву не включаємо
  const cls = Array.from(el.classList).filter(function (c) { return c !== 'dom-highlight'; });
  if (el.id) name += '#' + el.id;
  else if (cls.length) name += '.' + cls[0];
  return name;
}

function nodePath(el) {
  const parts = [];
  for (let cur = el; cur; cur = cur.parentElement) parts.unshift(nodeName(cur));
  return parts.join(' › ');
}

function shortText(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return '(немає тексту)';
  return text.length > 70 ? text.slice(0, 70) + '…' : text;
}

/* ---------- 3. Вікно-повідомлення з функцією зворотного виклику ---------- */

const dialog = document.createElement('div');
dialog.id = 'domDialog';
dialog.className = 'dom-dialog';
dialog.hidden = true;
dialog.setAttribute('role', 'dialog');

/**
 * Показує повідомлення з кнопками.
 * buttons — масив { text, action, style }.
 * Після натискання кнопки викликається onAnswer(action) — це і є callback.
 */
function showMessage(html, buttons, onAnswer) {
  dialog.innerHTML = html + '<div class="dom-buttons"></div>';
  const box = dialog.querySelector('.dom-buttons');
  buttons.forEach(function (b) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.text;
    if (b.style) btn.className = b.style;
    btn.addEventListener('click', function () {
      onAnswer(b.action); // передаємо відповідь у функцію зворотного виклику
    });
    box.appendChild(btn);
  });
  dialog.hidden = false;
  box.firstChild.focus();
}

function hideMessage() {
  dialog.hidden = true;
}

/* ---------- 4. Підсвічування поточного вузла ---------- */

let highlighted = null;

function highlight(el) {
  if (highlighted) highlighted.classList.remove('dom-highlight');
  highlighted = null;
  // елементи <head>, а також <html> і <body> не підсвічуємо — вони не мають окремої області
  if (el === document.documentElement || el === document.body || el.closest('head')) return;
  el.classList.add('dom-highlight');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlighted = el;
}

/* ---------- 5. Крок обходу ---------- */

const BTN_NEXT = { text: 'Далі →', action: 'next', style: 'primary' };
const BTN_BACK = { text: '← Назад', action: 'back' };
const BTN_EXIT = { text: 'Завершити', action: 'exit', style: 'danger' };

/**
 * Показує вузол з номером index і чекає відповіді користувача.
 * onFinish — callback, який викликається після завершення обходу.
 */
function visit(nodes, index, onFinish) {
  const item = nodes[index];
  const el = item.el;
  const isFirst = index === 0;
  const isLast = index === nodes.length - 1;

  highlight(el);

  let question, buttons;
  if (isFirst) {
    question = 'Перейти до наступного вузла чи завершити роботу?';
    buttons = [BTN_NEXT, BTN_EXIT];
  } else if (isLast) {
    question = 'Це нижній (останній) вузол. Повернутися назад чи вийти?';
    buttons = [BTN_BACK, BTN_EXIT];
  } else {
    question = 'Пройти далі чи повернутися?';
    buttons = [BTN_NEXT, BTN_BACK];
  }

  const html =
    '<h3>&lt;' + el.tagName.toLowerCase() + '&gt;</h3>' +
    '<p class="dom-progress">Вузол ' + (index + 1) + ' з ' + nodes.length +
    ' · рівень ' + item.depth + '</p>' +
    '<p class="dom-info"><b>Вміст:</b> ' + escapeHtml(shortText(el)) + '</p>' +
    '<p class="dom-info"><b>Дочірніх елементів:</b> ' + el.children.length + '</p>' +
    '<div class="dom-path">' + escapeHtml(nodePath(el)) + '</div>' +
    '<p class="dom-question">' + question + '</p>';

  showMessage(html, buttons, function (answer) {
    if (answer === 'next') visit(nodes, index + 1, onFinish);
    else if (answer === 'back') visit(nodes, index - 1, onFinish);
    else onFinish(index);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/* ---------- 6. Запуск ---------- */

function startTour() {
  const nodes = collectNodes();
  visit(nodes, 0, function (lastIndex) {
    // callback завершення
    highlight(document.body);
    hideMessage();
    console.log('Обхід завершено на вузлі ' + (lastIndex + 1) + ' з ' + nodes.length);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.body.appendChild(dialog);
  document.getElementById('domTourBtn').addEventListener('click', startTour);
  // Esc — швидкий вихід
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !dialog.hidden) {
      highlight(document.body);
      hideMessage();
    }
  });
});

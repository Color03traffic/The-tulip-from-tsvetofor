/**
 * Тюльпан03 — скрипт таблицы «Заказы и остатки тюльпан 2027».
 *
 * Лист «Заказы с сайта», столбец K «Статус»:
 *   «Подтверждён» → заказ сам появляется на листе «Заказ» новым покупателем
 *                   (первый свободный столбец): имя и телефон, дата, количества по сортам.
 *                   Цвет с сайта раскладывается в сорт этого цвета, где больше «Осталось».
 *   «Отменён»     → если по заказу ещё не было оплат и он не выдан — его столбец на «Заказе»
 *                   очищается целиком и освобождается для следующего заказа;
 *                   если оплаты уже есть — количества обнуляются, в заметке «ОТМЕНЁН».
 * Связь заказа и столбца — заметка (строка 59) «Сайт №1001 …». Её не стирать.
 * Меню «Тюльпан03 → Перенести подтверждённые заказы» — догнать вручную, если что-то пропущено.
 */

var SITE_SHEET = 'Заказы с сайта';
var ITEMS_SHEET = 'С сайта — позиции';
var ORDER_SHEET = 'Заказ';
var FIRST_COL = 7;     // G — первый покупатель
var LAST_COL = 391;    // OA
var ISSUED_ROW = 1, ISSUED_DATE_ROW = 66;
var PAY_FIRST_ROW = 53, PAY_LAST_ROW = 55, PAY_DATE_SHIFT = 10; // оплаты 53–55 → их даты 63–65 // галочка «Выдан» и дата выдачи
var NAME_ROW = 2, DATE_ROW = 3, FIRST_ROW = 4, LAST_ROW = 41, NOTE_ROW = 59;
var PHONE_ROW = 67, CODE_ROW = 68; // телефон (+7 914 000-00-00) и код личного кабинета (6 цифр)
var STATUS_COL = 11, NOTE_COL = 12; // K, L на листе «Заказы с сайта»

// Цвет с сайта → строки сортов на листе «Заказ» (как в сводке «Остатка от закупа»)
var COLOR_ROWS = {
  'Жёлтый': [4],
  'Белый': [5, 6, 7],
  'Кремовый': [8, 9, 10],
  'Розовый': [11, 12, 13, 14, 15, 16, 17],
  'Нежно-розовый': [18],
  'Красный': [19, 20, 21, 22, 23, 24],
  'Бело-сиреневый': [25],
  'Оранжевый': [26, 27],
  'Красно-жёлтый': [28, 29],
  'Красно-белый': [30, 31, 32],
  'Фиолетовый': [33, 34],
  'Бело-розовый': [35, 36, 37],
  'Махровый розовый': [38, 39],
  'Махровый фиолетовый': [40],
  'Микс': [41]
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Тюльпан03')
    .addItem('Перенести подтверждённые заказы', 'syncAll')
    .addItem('Проставить телефоны и коды кабинета', 'fillAllCodes')
    .addToUi();
}

function onEdit(e) {
  var r = e && e.range;
  if (!r) return;
  var sh = r.getSheet();
  if (sh.getName() === ORDER_SHEET) { checkQty(e); stampIssued(e); stampOrderDate(e); stampPayments(e); stampPhoneCode(e); guardOrderSheet(e); return; }
  if (sh.getName() !== SITE_SHEET) return;
  if (r.getColumn() > STATUS_COL || r.getLastColumn() < STATUS_COL || r.getLastRow() < 2) return;
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    for (var row = Math.max(2, r.getRow()); row <= r.getLastRow(); row++) {
      try { syncRow(sh, row); }
      catch (err) { warn('Заказ в строке ' + row + ' не перенесён', String(err && err.message || err) +
        '\n\nПопробуйте меню «Тюльпан03 → Перенести подтверждённые заказы».'); }
    }
  } finally {
    lock.releaseLock();
  }
  // Сняли статус «Подтверждён» (очистили ячейку) — заказ остаётся на «Заказе», предупреждаем
  if (r.getNumRows() === 1 && r.getColumn() === STATUS_COL && e.oldValue === 'Подтверждён' && !r.getValue()) {
    warn('Статус снят, но заказ остался на листе «Заказ»',
      'Заказ с сайта уже перенесён на лист «Заказ» и продолжает вычитаться из остатков.\n\n' +
      'Чтобы убрать его из заказов — выберите статус «Отменён» (количества обнулятся).\n' +
      'Чтобы вернуть как было — снова выберите «Подтверждён».');
  }
}

// Количества (строки 4–41): только пачками по 20.
// Срабатывает и на вставку (Ctrl+V), протягивание и ввод с телефона — там проверка данных Google не останавливает.
// Проверяется только введённое число — без пересчёта таблицы, чтобы ввод не тормозил.
// «Не больше, чем осталось» проверяет сама таблица (проверка данных) при обычном вводе.
function checkQty(e) {
  var r = e.range;
  if (r.getLastRow() < FIRST_ROW || r.getRow() > LAST_ROW || r.getLastColumn() < FIRST_COL) return;
  var single = r.getNumRows() === 1 && r.getNumColumns() === 1;
  var ok = function (v) {
    if (v === '' || v === null || v === undefined) return true;
    var n = Number(String(v).replace(/\s/g, ''));
    return n > 0 && n % 20 === 0;
  };
  if (single) {
    if (ok(e.value)) return;
    r.setValue(e.oldValue !== undefined ? (Number(e.oldValue) || e.oldValue) : '');
    warn('Количество не принято', 'Только пачками по 20 шт: 20, 40, 60, … 500, 520, 540…\nВведено: ' + e.value +
      '\n\nВ ячейке оставлено прежнее значение.');
    return;
  }
  var r0 = Math.max(r.getRow(), FIRST_ROW), r1 = Math.min(r.getLastRow(), LAST_ROW);
  var c0 = Math.max(r.getColumn(), FIRST_COL), c1 = Math.min(r.getLastColumn(), LAST_COL);
  var rng = r.getSheet().getRange(r0, c0, r1 - r0 + 1, c1 - c0 + 1);
  var vals = rng.getValues(), bad = [];
  for (var i = 0; i < vals.length; i++) for (var j = 0; j < vals[i].length; j++) {
    if (ok(vals[i][j])) continue;
    bad.push(colLetter(c0 + j) + (r0 + i) + ' (' + vals[i][j] + ')');
    vals[i][j] = '';
  }
  if (!bad.length) return;
  rng.setValues(vals);
  warn('Количество не принято', 'Только пачками по 20 шт.\nОчищено: ' + bad.join(', '));
}

// Галочка «Выдан» (строка 1) → дата выдачи (строка 66): поставили — сегодняшняя дата, сняли — очищаем
function stampIssued(e) {
  var r = e.range;
  if (r.getRow() !== ISSUED_ROW || r.getLastColumn() < FIRST_COL) return;
  var sh = r.getSheet();
  var c0 = Math.max(r.getColumn(), FIRST_COL), n = r.getLastColumn() - c0 + 1;
  var marks = sh.getRange(ISSUED_ROW, c0, 1, n).getValues()[0];
  var dates = sh.getRange(ISSUED_DATE_ROW, c0, 1, n).getValues()[0];
  var today = dayOf(new Date(), sh.getParent());
  var out = marks.map(function (m, i) {
    if (m === true) return [dates[i] instanceof Date ? dates[i] : today][0];
    return '';
  });
  sh.getRange(ISSUED_DATE_ROW, c0, 1, n).setValues([out]);
}

// Вписали покупателя или количества, а дата заказа (строка 3) пустая — ставим сегодняшнюю.
// От даты заказа зависит цена (лист «Градация цен»).
function stampOrderDate(e) {
  var r = e.range;
  if (r.getLastRow() < NAME_ROW || r.getRow() > LAST_ROW || r.getLastColumn() < FIRST_COL) return;
  var sh = r.getSheet();
  var c0 = Math.max(r.getColumn(), FIRST_COL), n = r.getLastColumn() - c0 + 1;
  var head = sh.getRange(NAME_ROW, c0, 2, n).getValues(); // [имена], [даты]
  var today = null, changed = false;
  var dates = head[1].map(function (d, i) {
    if (String(head[0][i]).trim() !== '' && (d === '' || d === null)) {
      today = today || dayOf(new Date(), sh.getParent());
      changed = true;
      return today;
    }
    return d;
  });
  if (changed) sh.getRange(DATE_ROW, c0, 1, n).setValues([dates]);
}

// Внесли сумму оплаты (строки 53–55) — в строке даты (63–65) ставится дата и время, если она пустая.
// Сумму стёрли — дата тоже стирается.
function stampPayments(e) {
  var r = e.range;
  if (r.getLastRow() < PAY_FIRST_ROW || r.getRow() > PAY_LAST_ROW || r.getLastColumn() < FIRST_COL) return;
  var sh = r.getSheet();
  var c0 = Math.max(r.getColumn(), FIRST_COL), n = r.getLastColumn() - c0 + 1;
  var r0 = Math.max(r.getRow(), PAY_FIRST_ROW), r1 = Math.min(r.getLastRow(), PAY_LAST_ROW), nr = r1 - r0 + 1;
  var sums = sh.getRange(r0, c0, nr, n).getValues();
  var dRange = sh.getRange(r0 + PAY_DATE_SHIFT, c0, nr, n);
  var dates = dRange.getValues();
  var now = null, changed = false;
  for (var i = 0; i < nr; i++) for (var j = 0; j < n; j++) {
    var paid = sums[i][j] !== '' && Number(sums[i][j]) !== 0;
    if (paid && (dates[i][j] === '' || dates[i][j] === null)) {
      now = now || dayOf(new Date(), sh.getParent()); dates[i][j] = now; changed = true;
    } else if (!paid && dates[i][j] !== '') {
      dates[i][j] = ''; changed = true;
    }
  }
  if (changed) dRange.setValues(dates);
}

// Имя (строка 2) или телефон (строка 67) изменили → телефон приводим к виду +7 914 000-00-00,
// в строке 68 появляется код личного кабинета (печатается в накладной).
function stampPhoneCode(e) {
  var r = e.range;
  var touchesName = r.getRow() <= NAME_ROW && r.getLastRow() >= NAME_ROW;
  var touchesPhone = r.getRow() <= PHONE_ROW && r.getLastRow() >= PHONE_ROW;
  if (!(touchesName || touchesPhone) || r.getLastColumn() < FIRST_COL) return;
  var sh = r.getSheet();
  var c0 = Math.max(r.getColumn(), FIRST_COL);
  var noPhone = [];
  for (var c = c0; c <= r.getLastColumn(); c++) {
    var res = ensurePhoneCode(sh, c, touchesName);
    if (res === 'nophone') noPhone.push(colLetter(c));
  }
  if (noPhone.length) {
    sh.getParent().toast('В имени нет телефона (столбец ' + noPhone.join(', ') + '). Впишите телефон в строку 67 — без него у покупателя не будет личного кабинета.', 'Тюльпан03', 15);
  }
}

// Телефон и код для столбца покупателя. fromName — взять телефон из строки 2, если он там есть.
// Возвращает 'nophone', если имя есть, а телефона нет.
function ensurePhoneCode(sh, col, fromName) {
  var name = String(sh.getRange(NAME_ROW, col).getValue() || '').trim();
  var pc = sh.getRange(PHONE_ROW, col, 2, 1).getValues();
  var phone = normPhone(pc[0][0]);
  if (fromName || !phone) phone = phoneFromText(name) || phone;
  if (!name && !phone) return '';
  if (!phone) {
    if (String(pc[0][0]).trim() === '') return 'nophone';
    return ''; // вписано что-то не похожее на номер — оставляем как есть
  }
  var code = String(pc[1][0] || '').replace(/\D/g, '');
  if (code.length !== 6) code = codeForPhone(sh, phone, col) || newCode();
  if (pc[0][0] !== phone || String(pc[1][0]) !== code) {
    sh.getRange(PHONE_ROW, col, 2, 1).setNumberFormat('@').setValues([[phone], [code]]);
  }
  return 'ok';
}

// Тот же покупатель в другом столбце — тот же код
function codeForPhone(sh, phone, exceptCol) {
  var width = LAST_COL - FIRST_COL + 1;
  var v = sh.getRange(PHONE_ROW, FIRST_COL, 2, width).getValues();
  for (var j = 0; j < width; j++) {
    if (FIRST_COL + j === exceptCol) continue;
    var code = String(v[1][j] || '').replace(/\D/g, '');
    if (code.length === 6 && normPhone(v[0][j]) === phone) return code;
  }
  return '';
}

function newCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

// Меню: телефоны и коды для всех уже вписанных покупателей
function fillAllCodes() {
  var sh = SpreadsheetApp.getActive().getSheetByName(ORDER_SHEET);
  var names = sh.getRange(NAME_ROW, FIRST_COL, 1, LAST_COL - FIRST_COL + 1).getValues()[0];
  var ok = 0, noPhone = [];
  names.forEach(function (n, j) {
    if (String(n).trim() === '') return;
    var res = ensurePhoneCode(sh, FIRST_COL + j, false);
    if (res === 'ok') ok++;
    if (res === 'nophone') noPhone.push(String(n).trim());
  });
  warn('Телефоны и коды', 'Готово: ' + ok + ' покупателей с телефоном и кодом.' +
    (noPhone.length ? '\n\nБез телефона (впишите в строку 67): ' + noPhone.join(', ') : ''));
}

// +7 914 000-00-00 — как на сайте
function normPhone(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length === 10 && d[0] === '9') d = '7' + d;
  if (!/^7\d{10}$/.test(d)) return '';
  return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
}

function phoneFromText(s) {
  var m = String(s).match(/(\+?\d[\d\s\-()]{8,}\d)/);
  return m ? normPhone(m[1]) : '';
}

// Защита служебной заметки «Сайт №…» (строка 59 листа «Заказ»)
function guardOrderSheet(e) {
  var r = e.range;
  if (r.getRow() > NOTE_ROW || r.getLastRow() < NOTE_ROW || r.getLastColumn() < FIRST_COL) return;
  var msg = 'По заметке «Сайт №…» таблица связывает этот столбец с заказом с сайта.\n\n' +
    'Если её удалить или изменить:\n' +
    '• статус «Отменён» на листе «Заказы с сайта» больше не обнулит этот заказ;\n' +
    '• «Перенести подтверждённые заказы» создаст заказ ЗАНОВО в новом столбце — он посчитается дважды и остатки уменьшатся лишний раз.\n\n' +
    'Свою пометку можно дописать ПОСЛЕ текста «Сайт №…».';
  if (r.getNumRows() === 1 && r.getNumColumns() === 1) {
    var old = String(e.oldValue || '');
    var m = old.match(/^Сайт №\d+/);
    if (!m) return;
    var now = String(r.getValue() || '');
    if (now.indexOf(m[0]) === 0 && !/\d/.test(now.charAt(m[0].length))) return; // начало сохранено — ок
    r.setValue(now ? old + ' ' + now : old); // возвращаем, текст пользователя дописываем в конец
    warn('Эту заметку удалять нельзя — восстановлена', msg);
    return;
  }
  // Очистили сразу несколько ячеек — старых значений не видно; предупреждаем, только если заметки стали пустыми
  var c0 = Math.max(r.getColumn(), FIRST_COL);
  var vals = r.getSheet().getRange(NOTE_ROW, c0, 1, r.getLastColumn() - c0 + 1).getValues()[0];
  if (vals.some(function (x) { return String(x).trim() !== ''; })) return;
  warn('Внимание: затронута строка 59 (заметки)', msg +
    '\n\nЕсли стёрли заметку «Сайт №…» — нажмите Ctrl+Z, чтобы вернуть.');
}

function warn(title, text) {
  try {
    SpreadsheetApp.getUi().alert(title, text, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    SpreadsheetApp.getActive().toast(text, title, 20);
  }
}

function syncAll(quiet) {
  quiet = quiet === true;
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SITE_SHEET);
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(quiet ? 5000 : 20000)) return;
  var n = 0, errs = [];
  try {
    for (var row = 2; row <= sh.getLastRow(); row++) {
      try { if (syncRow(sh, row)) n++; }
      catch (err) { errs.push('строка ' + row + ': ' + (err && err.message || err)); }
    }
  } finally {
    lock.releaseLock();
  }
  if (errs.length) warn('Не все заказы перенесены', errs.join('\n'));
  if (!quiet || n) ss.toast('Обработано заказов с сайта: ' + n, 'Тюльпан03');
}

// Возвращает true, если что-то поменялось на листе «Заказ»
function syncRow(sh, row) {
  var v = sh.getRange(row, 1, 1, NOTE_COL).getValues()[0];
  var num = Number(v[0]);
  if (!num) return false;
  var status = String(v[STATUS_COL - 1] || '').trim();
  var ss = sh.getParent();
  var ord = ss.getSheetByName(ORDER_SHEET);
  var width = LAST_COL - FIRST_COL + 1;
  var tag = 'Сайт №' + num;
  var notes = ord.getRange(NOTE_ROW, FIRST_COL, 1, width).getValues()[0];
  var idx = -1;
  for (var i = 0; i < notes.length; i++) {
    if (String(notes[i]).indexOf(tag) === 0 && !/\d/.test(String(notes[i]).charAt(tag.length))) { idx = i; break; }
  }
  var col = idx >= 0 ? FIRST_COL + idx : 0;
  var nRows = LAST_ROW - FIRST_ROW + 1;

  if (status === 'Подтверждён') {
    if (col) {
      var cur = ord.getRange(FIRST_ROW, col, nRows, 1).getValues();
      if (cur.some(function (c) { return Number(c[0]) > 0; })) return false; // уже перенесён
    } else {
      col = freeColumn(ord, notes);
      if (!col) throw new Error('На листе «Заказ» нет свободного столбца');
    }

    var items = ss.getSheetByName(ITEMS_SHEET).getDataRange().getValues().slice(1)
      .filter(function (it) { return Number(it[0]) === num; });
    var left = ord.getRange(FIRST_ROW, 6, nRows, 1).getValues(); // F «Осталось, шт»
    var qty = {};
    var unknown = [];
    items.forEach(function (it) {
      var color = String(it[2]).trim();
      var q = Number(it[4]) || 0;
      var rows = COLOR_ROWS[color];
      if (!rows || !q) { if (q) unknown.push(color + ' ' + q); return; }
      var best = rows[0], bestLeft = -Infinity;
      rows.forEach(function (rr) {
        var l = Number(left[rr - FIRST_ROW][0]);
        if (isNaN(l)) l = 0;
        if (l > bestLeft) { bestLeft = l; best = rr; }
      });
      qty[best] = (qty[best] || 0) + q;
    });

    var out = [];
    for (var k = FIRST_ROW; k <= LAST_ROW; k++) out.push([qty[k] || '']);
    var d = v[1] instanceof Date ? v[1] : new Date();
    var name = String(v[2]).trim() + (v[3] ? ', ' + String(v[3]).trim() : '');
    var note = tag + ' (с сайта)' + (v[7] ? ': ' + String(v[7]).trim() : '');
    if (unknown.length) note += ' | НЕ РАЗНЕСЕНО: ' + unknown.join(', ');

    var pc = ord.getRange(PHONE_ROW, col, 2, 1).getValues();
    if (normPhone(pc[0][0]) !== normPhone(v[3])) ord.getRange(PHONE_ROW, col, 2, 1).clearContent(); // чужой телефон/код
    ord.getRange(NAME_ROW, col).setValue(name);
    ord.getRange(DATE_ROW, col).setValue(dayOf(d, ss));
    ord.getRange(FIRST_ROW, col, nRows, 1).setValues(out);
    ord.getRange(NOTE_ROW, col).setValue(note);
    ensurePhoneCode(ord, col, true);
    setMark(sh, row, v, '→ «Заказ», столбец ' + colLetter(col) + (unknown.length ? ' (есть неразнесённые цвета!)' : ''));
    return true;
  }

  if (status === 'Отменён' && col) {
    var paid = ord.getRange(PAY_FIRST_ROW, col, PAY_LAST_ROW - PAY_FIRST_ROW + 1, 1).getValues()
      .some(function (p) { return Number(p[0]) > 0; });
    var issued = ord.getRange(ISSUED_ROW, col).getValue() === true;
    if (!paid && !issued) {
      // Оплат не было — освобождаем столбец целиком, следующий заказ встанет сюда
      ord.getRange(NAME_ROW, col, 2, 1).clearContent();
      ord.getRange(FIRST_ROW, col, nRows, 1).clearContent();
      ord.getRange(NOTE_ROW, col).clearContent();
      ord.getRange(ISSUED_DATE_ROW, col).clearContent();
      ord.getRange(PHONE_ROW, col, 2, 1).clearContent();
      setMark(sh, row, v, '→ отменён, столбец ' + colLetter(col) + ' на «Заказе» освобождён');
      return true;
    }
    var empty = [];
    for (var m = 0; m < nRows; m++) empty.push(['']);
    ord.getRange(FIRST_ROW, col, nRows, 1).setValues(empty);
    var old = String(notes[idx]);
    if (old.indexOf('ОТМЕНЁН') < 0) ord.getRange(NOTE_ROW, col).setValue(tag + ' — ОТМЕНЁН' + old.slice(tag.length));
    setMark(sh, row, v, '→ отменён, в «Заказ» столбец ' + colLetter(col) + ' количества обнулены');
    return true;
  }
  return false;
}

// Первый полностью пустой столбец покупателя: нет имени, заметки, количеств, телефона и кода
function freeColumn(ord, notes) {
  var width = LAST_COL - FIRST_COL + 1;
  var names = ord.getRange(NAME_ROW, FIRST_COL, 1, width).getValues()[0];
  var qty = ord.getRange(FIRST_ROW, FIRST_COL, LAST_ROW - FIRST_ROW + 1, width).getValues();
  var pc = ord.getRange(PHONE_ROW, FIRST_COL, 2, width).getValues();
  var blank = function (x) { return String(x).trim() === ''; };
  for (var j = 0; j < width; j++) {
    if (!blank(names[j]) || !blank(notes[j]) || !blank(pc[0][j]) || !blank(pc[1][j])) continue;
    if (qty.some(function (r) { return !blank(r[j]); })) continue;
    return FIRST_COL + j;
  }
  throw new Error('На листе «Заказ» нет свободного столбца');
}

// Пометка в «Заметке менеджера»: свою заметку менеджера не затираем, только служебную «→ …»
function setMark(sh, row, v, text) {
  var cur = String(v[NOTE_COL - 1] || '');
  var i = cur.indexOf('→');
  var mine = (i >= 0 ? cur.slice(0, i) : cur).trim();
  sh.getRange(row, NOTE_COL).setValue(mine ? mine + ' ' + text : text);
}

// Дата и время по часовому поясу таблицы (Иркутск), строкой — таблица сама поймёт её как дату
function dayOf(d, ss) {
  return Utilities.formatDate(d, ss.getSpreadsheetTimeZone(), 'dd.MM.yyyy HH:mm');
}

function colLetter(c) {
  var s = '';
  while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

/**
 * Тюльпан03 — скрипт таблицы «Заказы и остатки тюльпан 2027».
 *
 * Лист «Заказы с сайта», столбец K «Статус»:
 *   «Подтверждён» → заказ сам появляется на листе «Заказ» новым покупателем
 *                   (первый свободный столбец): имя и телефон, дата, количества по сортам.
 *                   Цвет с сайта раскладывается в сорт этого цвета, где больше «Осталось».
 *   «Отменён»     → у этого покупателя на «Заказе» количества обнуляются,
 *                   в заметке пишется «отменён».
 * Связь заказа и столбца — заметка (строка 59) «Сайт №1001 …». Её не стирать.
 * Меню «Тюльпан03 → Перенести подтверждённые заказы» — догнать вручную, если что-то пропущено.
 */

var SITE_SHEET = 'Заказы с сайта';
var ITEMS_SHEET = 'С сайта — позиции';
var ORDER_SHEET = 'Заказ';
var FIRST_COL = 7;     // G — первый покупатель
var LAST_COL = 391;    // OA
var NAME_ROW = 2, DATE_ROW = 3, FIRST_ROW = 4, LAST_ROW = 41, NOTE_ROW = 59;
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
    .addToUi();
}

function onEdit(e) {
  var r = e && e.range;
  if (!r) return;
  var sh = r.getSheet();
  if (sh.getName() !== SITE_SHEET) return;
  if (r.getColumn() > STATUS_COL || r.getLastColumn() < STATUS_COL || r.getLastRow() < 2) return;
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    for (var row = Math.max(2, r.getRow()); row <= r.getLastRow(); row++) syncRow(sh, row);
  } finally {
    lock.releaseLock();
  }
}

function syncAll() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SITE_SHEET);
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  var n = 0;
  try {
    for (var row = 2; row <= sh.getLastRow(); row++) if (syncRow(sh, row)) n++;
  } finally {
    lock.releaseLock();
  }
  ss.toast('Обработано заказов: ' + n, 'Тюльпан03');
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
      var names = ord.getRange(NAME_ROW, FIRST_COL, 1, width).getValues()[0];
      for (var j = 0; j < names.length; j++) {
        if (String(names[j]).trim() === '' && String(notes[j]).trim() === '') { col = FIRST_COL + j; break; }
      }
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

    ord.getRange(NAME_ROW, col).setValue(name);
    ord.getRange(DATE_ROW, col).setValue(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    ord.getRange(FIRST_ROW, col, nRows, 1).setValues(out);
    ord.getRange(NOTE_ROW, col).setValue(note);
    setMark(sh, row, v, '→ «Заказ», столбец ' + colLetter(col) + (unknown.length ? ' (есть неразнесённые цвета!)' : ''));
    return true;
  }

  if (status === 'Отменён' && col) {
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

// Пометка в «Заметке менеджера»: свою заметку менеджера не затираем, только служебную «→ …»
function setMark(sh, row, v, text) {
  var cur = String(v[NOTE_COL - 1] || '');
  var i = cur.indexOf('→');
  var mine = (i >= 0 ? cur.slice(0, i) : cur).trim();
  sh.getRange(row, NOTE_COL).setValue(mine ? mine + ' ' + text : text);
}

function colLetter(c) {
  var s = '';
  while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

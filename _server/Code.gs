/**
 * =========================================================
 *  Тюльпан03 — сервер сайта (Google Apps Script)
 *
 *  Живёт внутри Google Таблицы «Тюльпан03 — заказы с сайта»:
 *  Расширения → Apps Script. Делает четыре вещи:
 *    1. регистрация и вход покупателей (телефон, ФИО, пароль);
 *    2. приём заказов с сайта в таблицу (листы «Заказы» и «Позиции»);
 *    3. личный кабинет: история заказов, оплачено/осталось и выдача (из таблицы 2027),
 *       заказы из магазина — после ввода кода из накладной;
 *    4. уведомления о новом заказе в Telegram и MAX;
 *    5. отмена заказа покупателем (пока не подтверждён), лист «Покупатели до 100 шт»;
 *    6. уведомления покупателям в Telegram (заказ принят / оплата / выдан) — через того же бота.
 *
 *  Ключи ботов НЕ пишутся в этот код. Они хранятся в
 *  «Настройки проекта → Свойства скрипта»:
 *    TELEGRAM_TOKEN    — ключ Telegram-бота от @BotFather
 *    TELEGRAM_CHAT_ID  — кому присылать заказы (узнать: запустите findTelegramChatId)
 *    MAX_TOKEN         — ключ бота MAX (если есть)
 *    MAX_USER_ID       — кому присылать в MAX (узнать: запустите findMaxUserId)
 * =========================================================
 */

// Откуда сервер берёт цены — тот же prices.js, что и сайт,
// поэтому цены в таблице всегда совпадают с ценами на сайте.
var PRICES_URL = 'https://raw.githubusercontent.com/Color03traffic/The-tulip-from-tsvetofor/main/prices.js';

// Сорта, которые можно заказать (название → тип цены)
var PRODUCTS = {
  'Жёлтый': 'smooth', 'Белый': 'smooth', 'Кремовый': 'smooth', 'Розовый': 'smooth',
  'Нежно-розовый': 'smooth', 'Красный': 'smooth', 'Оранжевый': 'smooth', 'Красно-жёлтый': 'smooth', 'Красно-белый': 'smooth',
  'Бело-сиреневый': 'smooth', 'Бело-розовый': 'smooth', 'Фиолетовый': 'smooth',
  'Махровый розовый': 'terry', 'Махровый фиолетовый': 'terry', 'Микс': 'mix'
};
var TYPE_NAMES = { smooth: 'Обычный', terry: 'Махровый', mix: 'Микс' };

var SESSION_DAYS = 365;        // сколько помнить вход на устройстве
var HASH_ROUNDS = 3000;        // сколько раз перемешивать пароль
var MAX_LOGIN_FAILS = 6;       // попыток входа за 15 минут

// Статусы заказов ведутся в таблице 2027 (лист «Заказы с сайта», столбец K).
// Личный кабинет показывает статус оттуда; если таблица недоступна — из столбца K «Заказов».
var STATUS_BOOK_ID = '1i8uQUIClrDEoUFOIzj9FilPLQnqNrmeA5bT-jpF9gCw';
var STATUS_SHEET = 'Заказы с сайта';

// Лист «Заказ» таблицы 2027: покупатель = столбец G..OA. Отсюда кабинет берёт оплаты,
// выдачу и заказы, сделанные в магазине (по телефону и коду из накладной).
var BOOK_ORDER_SHEET = 'Заказ';
var BK = { firstCol: 7, cols: 385, rows: 68, issued: 1, name: 2, date: 3, first: 4, last: 41,
           priceSmooth: 45, priceTerry: 46, priceMix: 47, total: 52, payFirst: 53, payLast: 55,
           note: 59, issuedDate: 66, phone: 67, code: 68 };
// Строки сортов на «Заказе» → цвет на сайте (как в сводке «Остатка от закупа»)
var BOOK_COLOR_ROWS = {
  'Жёлтый': [4], 'Белый': [5, 6, 7], 'Кремовый': [8, 9, 10], 'Розовый': [11, 12, 13, 14, 15, 16, 17],
  'Нежно-розовый': [18], 'Красный': [19, 20, 21, 22, 23, 24], 'Бело-сиреневый': [25], 'Оранжевый': [26, 27],
  'Красно-жёлтый': [28, 29], 'Красно-белый': [30, 31, 32], 'Фиолетовый': [33, 34], 'Бело-розовый': [35, 36, 37],
  'Махровый розовый': [38, 39], 'Махровый фиолетовый': [40], 'Микс': [41]
};
var USER_VERIFIED_COL = 9; // I «Код из магазина подтверждён» на листе «Покупатели»

var SH_ORDERS = 'Заказы', SH_ITEMS = 'Позиции', SH_USERS = 'Покупатели', SH_SESSIONS = 'Сессии';
var SH_LEADS = 'Покупатели до 100 шт', SH_NOTIFY = 'Уведомления';
var MIN_ORDER = 100;          // минимальный предзаказ, шт
var USER_TG_COL = 10;         // J «Telegram (chat_id)» на листе «Покупатели»
var SITE_URL = 'https://xn--03-6kc7blkt5fq.xn--p1ai/account.html';

/* =================== Точка входа =================== */

function doPost(e) {
  var res;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var handlers = {
      register: apiRegister, login: apiLogin, me: apiMe,
      logout: apiLogout, orders: apiOrders, order: apiOrder,
      claim: apiClaim, link: apiLink,
      cancel: apiCancel, lead: apiLead, tgLink: apiTgLink, tgCheck: apiTgCheck
    };
    var fn = handlers[body.action];
    res = fn ? fn(body) : { ok: false, error: 'Неизвестное действие' };
  } catch (err) {
    console.error(err && err.stack || err);
    res = { ok: false, error: (err && err.userMessage) || 'Ошибка сервера. Попробуйте ещё раз.' };
  }
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

// Проверка, что сервер работает: откройте адрес веб-приложения в браузере
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'tulpan03' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =================== Покупатели =================== */

function apiRegister(b) {
  var phone = normPhone(b.phone);
  var name = clean(b.name, 120);
  var password = String(b.password || '');
  if (!phone) return fail('Проверьте номер телефона');
  if (name.length < 2) return fail('Введите ФИО');
  if (password.length < 6) return fail('Пароль — не короче 6 символов');
  if (!b.consent) return fail('Нужно согласие на обработку персональных данных');

  return withLock(function () {
    if (findUserRow(phone)) return fail('Этот номер уже зарегистрирован. Войдите по паролю.');
    var salt = randomHex(16);
    var now = new Date();
    sheet(SH_USERS).appendRow([asText(phone), name, now, now, 0, 0, hashPassword(password, salt), salt]);
    return { ok: true, token: createSession(phone), user: { name: name, phone: phone } };
  });
}

function apiLogin(b) {
  var phone = normPhone(b.phone);
  if (!phone) return fail('Проверьте номер телефона');

  var cache = CacheService.getScriptCache();
  var key = 'fails_' + phone;
  var fails = Number(cache.get(key) || 0);
  if (fails >= MAX_LOGIN_FAILS) return fail('Слишком много попыток. Подождите 15 минут.');

  var found = findUserRow(phone);
  var ok = found && hashPassword(String(b.password || ''), found.values[7]) === found.values[6];
  if (!ok) {
    cache.put(key, String(fails + 1), 15 * 60);
    return fail('Неверный телефон или пароль');
  }
  cache.remove(key);
  sheet(SH_USERS).getRange(found.row, 4).setValue(new Date());
  return { ok: true, token: createSession(phone), user: { name: found.values[1], phone: phone } };
}

function apiMe(b) {
  var user = userByToken(b.token);
  return user ? { ok: true, user: { name: user.name, phone: user.phone } } : fail('Войдите снова', 'auth');
}

function apiLogout(b) {
  var s = findSession(b.token);
  if (s) sheet(SH_SESSIONS).deleteRow(s.row);
  return { ok: true };
}

/* =================== Заказы =================== */

function apiOrders(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');

  if (!/^\+7 \d{3} \d{3}-\d{2}-\d{2}$/.test(user.phone)) return fail('Войдите снова', 'auth');
  var orders = rows(SH_ORDERS).filter(function (r) { return r[3] === user.phone; });
  var items = rows(SH_ITEMS);
  var st = statusMap2027();
  var book = bookColumns(); // null — таблица 2027 недоступна, показываем без оплат
  var list = orders.map(function (r) {
    var num = Number(r[0]);
    var o = {
      number: num,
      date: toIso(r[1]),
      total: Number(r[6]) || 0,
      qty: Number(r[5]) || 0,
      status: (st ? st[num] : r[10]) || 'Новый',
      comment: r[7] || '',
      items: items.filter(function (i) { return Number(i[0]) === num; }).map(function (i) {
        return { name: i[2], type: PRODUCTS[i[2]] || 'smooth', qty: Number(i[4]), price: Number(i[5]) };
      })
    };
    var c = book && book.filter(function (b) { return b.siteNum === num; })[0];
    if (c && o.status !== 'Отменён') {
      o.total = c.total || o.total;
      o.paid = c.paid;
      o.left = Math.max(0, o.total - c.paid);
      if (c.issued) { o.status = 'Выдан'; o.issuedDate = c.issuedDate; }
    }
    return o;
  });

  // Заказы из магазина — только если покупатель подтвердил телефон кодом из накладной
  if (book && user.verified) {
    book.filter(function (b) { return !b.siteNum && b.phone === user.phone && b.qty > 0; }).forEach(function (b) {
      list.push({
        number: 0, shop: true, date: b.date, total: b.total, qty: b.qty,
        paid: b.paid, left: Math.max(0, b.total - b.paid),
        status: b.issued ? 'Выдан' : 'Принят', issuedDate: b.issuedDate, comment: '', items: b.items
      });
    });
  }
  list.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return { ok: true, orders: list, verified: !!user.verified, tg: !!user.tg };
}

// Вход по коду из накладной: покупатель из магазина сам создаёт кабинет (или задаёт новый пароль)
function apiClaim(b) {
  var phone = normPhone(b.phone);
  var code = String(b.code || '').replace(/\D/g, '');
  var password = String(b.password || '');
  if (!phone) return fail('Проверьте номер телефона');
  if (code.length !== 6) return fail('Код — 6 цифр, он напечатан в накладной');
  if (password.length < 6) return fail('Пароль — не короче 6 символов');
  if (!b.consent) return fail('Нужно согласие на обработку персональных данных');

  var match = checkCode(phone, code);
  if (match.error) return fail(match.error);

  return withLock(function () {
    var salt = randomHex(16);
    var now = new Date();
    var found = findUserRow(phone);
    var name;
    if (found) {
      name = String(found.values[1]);
      var sh = sheet(SH_USERS);
      sh.getRange(found.row, 4).setValue(now);
      sh.getRange(found.row, 7, 1, 3).setValues([[hashPassword(password, salt), salt, now]]);
      dropSessions(phone); // пароль сменился — старые входы на других устройствах больше не действуют
    } else {
      name = clean(match.name, 120) || 'Покупатель';
      sheet(SH_USERS).appendRow([asText(phone), name, now, now, 0, 0, hashPassword(password, salt), salt, now]);
    }
    return { ok: true, token: createSession(phone), user: { name: name, phone: phone } };
  });
}

// Уже есть кабинет — вводит код из накладной, и в кабинете появляются заказы из магазина
function apiLink(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');
  var code = String(b.code || '').replace(/\D/g, '');
  if (code.length !== 6) return fail('Код — 6 цифр, он напечатан в накладной');
  var match = checkCode(user.phone, code);
  if (match.error) return fail(match.error);
  var u = findUserRow(user.phone);
  if (u) sheet(SH_USERS).getRange(u.row, USER_VERIFIED_COL).setValue(new Date());
  return { ok: true };
}

// Есть ли на «Заказе» покупатель с этим телефоном и кодом. Ограничение попыток — как у входа.
function checkCode(phone, code) {
  var cache = CacheService.getScriptCache();
  var key = 'codefails_' + phone;
  var fails = Number(cache.get(key) || 0);
  if (fails >= MAX_LOGIN_FAILS) return { error: 'Слишком много попыток. Подождите 15 минут.' };
  var book = bookColumns();
  if (!book) return { error: 'Не удалось проверить код. Попробуйте через минуту.' };
  var match = function (c) { return c.phone === phone && c.code && c.code === code; };
  var hit = book.filter(match)[0];
  if (!hit && !book2027().fresh) { // покупателя могли вписать только что — проверяем по свежим данным
    book = bookColumns(true);
    hit = book && book.filter(match)[0];
  }
  if (!hit) {
    cache.put(key, String(fails + 1), 15 * 60);
    return { error: 'Неверный телефон или код. Проверьте накладную или напишите нам.' };
  }
  cache.remove(key);
  return { name: hit.name };
}

// Все покупатели с листа «Заказ» таблицы 2027
// Данные таблицы 2027 (статусы + покупатели «Заказа») — таблица открывается один раз,
// результат хранится в кэше BOOK_CACHE_SEC секунд. Триггер warmBook2027 (каждые 5 минут) обновляет кэш заранее,
// поэтому оплаты и статусы видны в кабинете с задержкой до 5 минут, а кабинет не ждёт таблицу 2027.
var BOOK_CACHE_SEC = 600, BOOK_CACHE_KEY = 'book2027_v1';
var _book = null;
function book2027(fresh) {
  if (_book && (!fresh || _book.fresh)) return _book;
  var cache = CacheService.getScriptCache();
  if (!fresh) {
    var hit = cache.get(BOOK_CACHE_KEY);
    if (hit) { try { _book = JSON.parse(hit); return _book; } catch (e) {} }
  }
  var ss;
  try { ss = SpreadsheetApp.openById(STATUS_BOOK_ID); } catch (e) { console.warn('Таблица 2027: ' + e); return { st: null, cols: null }; }
  _book = { st: readStatusMap(ss), cols: readBookColumns(ss), fresh: true };
  if (_book.st && _book.cols) {
    try { cache.put(BOOK_CACHE_KEY, JSON.stringify({ st: _book.st, cols: _book.cols }), BOOK_CACHE_SEC); } catch (e) {}
  }
  return _book;
}

// Запускается по расписанию (Триггеры → warmBook2027 → по времени, каждые 5 минут)
function warmBook2027() {
  book2027(true);
  try { tgPoll(); } catch (e) { console.warn('tgPoll: ' + e); }
  try { notifyCustomers(); } catch (e) { console.warn('notifyCustomers: ' + e); }
}

function bookColumns(fresh) { return book2027(fresh).cols; }
function statusMap2027() { return book2027().st; }

function readBookColumns(ss) {
  try {
    var sh = ss.getSheetByName(BOOK_ORDER_SHEET);
    // читаем только до последнего столбца с именем покупателя
    var names = sh.getRange(BK.name, BK.firstCol, 1, BK.cols).getValues()[0];
    var used = 0;
    for (var k = names.length - 1; k >= 0; k--) if (String(names[k]).trim() !== '') { used = k + 1; break; }
    if (!used) return [];
    var v = sh.getRange(1, BK.firstCol, BK.rows, used).getValues();
    var tz = ss.getSpreadsheetTimeZone();
    var out = [];
    for (var j = 0; j < used; j++) {
      var cell = function (row) { return v[row - 1][j]; };
      var rawName = String(cell(BK.name) || '').trim();
      if (!rawName) continue;
      var note = String(cell(BK.note) || '');
      var m = note.match(/^Сайт №(\d+)/);
      var phone = normPhone(cell(BK.phone)) || phoneFromText(rawName);
      var items = [], qty = 0;
      Object.keys(BOOK_COLOR_ROWS).forEach(function (color) {
        var q = BOOK_COLOR_ROWS[color].reduce(function (s, r) { return s + (Number(cell(r)) || 0); }, 0);
        if (!q) return;
        var type = PRODUCTS[color] || 'smooth';
        var price = Number(cell(type === 'terry' ? BK.priceTerry : type === 'mix' ? BK.priceMix : BK.priceSmooth)) || 0;
        items.push({ name: color, type: type, qty: q, price: price });
        qty += q;
      });
      var paid = 0;
      for (var r = BK.payFirst; r <= BK.payLast; r++) paid += Number(cell(r)) || 0;
      var d = cell(BK.date), di = cell(BK.issuedDate);
      out.push({
        siteNum: m ? Number(m[1]) : 0,
        name: rawName.replace(/[,;\s]*(\+?[78]|9)[\d\s\-()]{9,}\d.*$/, '').trim(),
        phone: phone,
        code: String(cell(BK.code) || '').replace(/\D/g, ''),
        date: d instanceof Date ? d.toISOString() : '',
        issued: cell(BK.issued) === true,
        issuedDate: di instanceof Date ? Utilities.formatDate(di, tz, 'dd.MM.yyyy') : '',
        total: Number(cell(BK.total)) || 0,
        paid: paid, qty: qty, items: items
      });
    }
    return out;
  } catch (e) {
    console.warn('Таблица 2027: ' + e);
    return null;
  }
}

// Телефон, вписанный в одну ячейку с именем: «Иванова, 8 914 000-00-00»
function phoneFromText(s) {
  var m = String(s).match(/(\+?\d[\d\s\-()]{8,}\d)/);
  return m ? normPhone(m[1]) : '';
}

function dropSessions(phone) {
  var sh = sheet(SH_SESSIONS);
  var all = rows(SH_SESSIONS);
  for (var i = all.length - 1; i >= 0; i--) if (String(all[i][1]) === phone) sh.deleteRow(i + 2);
}

function apiOrder(b) {
  var user = b.token ? userByToken(b.token) : null;
  var name = user ? user.name : clean(b.name, 120);
  var phone = user ? user.phone : normPhone(b.phone);
  if (!name) return fail('Введите имя');
  if (!phone) return fail('Проверьте номер телефона');
  if (!user && !b.consent) return fail('Нужно согласие на обработку персональных данных');

  // Состав заказа: только известные сорта, количество кратно 20
  var merged = {};
  (b.items || []).forEach(function (it) {
    var nm = String(it.name || '');
    var qty = Math.floor(Number(it.qty));
    if (!PRODUCTS[nm] || !(qty > 0)) return;
    qty = Math.ceil(qty / 20) * 20;
    merged[nm] = (merged[nm] || 0) + qty;
  });
  var names = Object.keys(merged);
  if (!names.length) return fail('Корзина пуста');

  var tiers = loadPrices();
  var totalQty = names.reduce(function (s, n) { return s + merged[n]; }, 0);
  if (totalQty > 200000) return fail('Слишком большое количество — свяжитесь с нами напрямую');
  if (totalQty < MIN_ORDER) return fail('Минимальный предзаказ — ' + MIN_ORDER + ' шт');

  var lines = names.map(function (n) {
    var price = priceFor(tiers, PRODUCTS[n], totalQty);
    return { name: n, type: PRODUCTS[n], qty: merged[n], price: price, sum: price * merged[n] };
  });
  var total = lines.reduce(function (s, l) { return s + l.sum; }, 0);
  var comment = clean(b.comment, 1000);
  var channel = { whatsapp: 'WhatsApp', telegram: 'Telegram', max: 'MAX' }[b.channel] || 'Сайт';
  var now = new Date();

  var number = withLock(function () {
    var sh = sheet(SH_ORDERS);
    // Номер — следующий после самого большого (даже если строки отсортировали)
    var num = rows(SH_ORDERS).reduce(function (m, r) { return Math.max(m, Number(r[0]) || 0); }, 1000) + 1;
    var summary = lines.map(function (l) { return l.name + ' — ' + l.qty + ' шт'; }).join('\n');
    sh.appendRow([num, now, name, asText(phone), summary, totalQty, total, comment, channel,
                  user ? 'да' : 'нет', 'Новый', '']);
    var itemRows = lines.map(function (l) { return [num, now, l.name, TYPE_NAMES[l.type], l.qty, l.price, l.sum]; });
    var shI = sheet(SH_ITEMS);
    shI.getRange(shI.getLastRow() + 1, 1, itemRows.length, 7).setValues(itemRows);
    if (user) updateUserStats(phone);
    try { snapSet(num, { st: 'Новый', paid: 0, issued: false }); } catch (e) { console.warn(e); }
    return num;
  });

  notifyOwner(number, name, phone, lines, totalQty, total, comment, channel, !!user);
  return { ok: true, number: number, total: total, qty: totalQty };
}

/* =================== Отмена заказа покупателем =================== */

// Покупатель отменяет свой заказ, пока менеджер его не подтвердил.
// Статус «Отменён» ставится в таблице 2027 (лист «Заказы с сайта», K) и в таблице сайта (K).
function apiCancel(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');
  var num = Number(b.number);
  var mine = rows(SH_ORDERS).map(function (r, i) { return { r: r, row: i + 2 }; })
    .filter(function (x) { return Number(x.r[0]) === num && String(x.r[3]) === user.phone; })[0];
  if (!mine) return fail('Заказ не найден');

  var res = withLock(function () {
    var ss = SpreadsheetApp.openById(STATUS_BOOK_ID);
    var sh = ss.getSheetByName(STATUS_SHEET);
    var n = sh.getLastRow() - 1;
    var ids = n > 0 ? sh.getRange(2, 1, n, 1).getValues() : [];
    var at = -1;
    for (var i = 0; i < ids.length; i++) if (Number(ids[i][0]) === num) { at = i + 2; break; }
    if (at < 0) return fail('Заказ ещё не дошёл до менеджера — попробуйте через минуту');
    var cur = String(sh.getRange(at, 11).getValue() || '').trim();
    if (cur === 'Отменён') return { ok: true };
    if (cur && cur !== 'Новый') return fail('Заказ уже принят — чтобы изменить или отменить его, напишите нам');
    sh.getRange(at, 11, 1, 2).setValues([['Отменён', 'Отменён покупателем на сайте']]);
    sheet(SH_ORDERS).getRange(mine.row, 11).setValue('Отменён');
    return { ok: true, done: true };
  });
  if (!res.ok || !res.done) return res;

  try { snapSet(num, { st: 'Отменён', paid: 0, issued: false }); } catch (e) {}
  CacheService.getScriptCache().remove(BOOK_CACHE_KEY);
  _book = null;
  var p = PropertiesService.getScriptProperties();
  sendTelegram(p.getProperty('TELEGRAM_TOKEN'), p.getProperty('TELEGRAM_CHAT_ID'),
    '❌ <b>Покупатель отменил заказ №' + num + '</b>\n👤 ' + esc(user.name) + '\n📞 ' + esc(user.phone) +
    '\n' + fmt(Number(mine.r[5]) || 0) + ' шт, ' + fmt(Number(mine.r[6]) || 0) + ' ₽');
  return { ok: true };
}

/* =================== Покупатели до 100 шт =================== */

// Покупатель нажал «Отправить заказ», но в корзине меньше 100 шт — заказ не уходит,
// а покупатель попадает на лист «Покупатели до 100 шт» (одна строка на телефон).
// wantContact — нажал «Хочу по наличию — свяжитесь со мной»: отметка + сообщение менеджеру.
function apiLead(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');
  var tiers = loadPrices();
  var merged = {};
  (b.items || []).forEach(function (it) {
    var nm = String(it.name || ''), qty = Math.floor(Number(it.qty));
    if (PRODUCTS[nm] && qty > 0) merged[nm] = (merged[nm] || 0) + Math.ceil(qty / 20) * 20;
  });
  var names = Object.keys(merged);
  var totalQty = names.reduce(function (s, n) { return s + merged[n]; }, 0);
  var total = names.reduce(function (s, n) { return s + priceFor(tiers, PRODUCTS[n], totalQty) * merged[n]; }, 0);
  var summary = names.map(function (n) { return n + ' — ' + merged[n] + ' шт'; }).join('\n');
  var want = !!b.wantContact;
  var now = new Date();
  var comment = clean(b.comment, 500);

  var first = withLock(function () {
    var sh = leadsSheet();
    var all = rows(SH_LEADS);
    for (var i = 0; i < all.length; i++) {
      if (String(all[i][0]) !== user.phone) continue;
      var r = i + 2;
      var wasWant = !!all[i][8];
      sh.getRange(r, 2, 1, 7).setValues([[user.name, all[i][2], now, summary, totalQty, total,
                                           want ? all[i][7] : (Number(all[i][7]) || 0) + 1]]);
      if (want) sh.getRange(r, 9, 1, 2).setValues([[now, comment]]);
      return want && !wasWant ? 'want' : want ? 'again' : '';
    }
    sh.appendRow([asText(user.phone), user.name, now, now, summary, totalQty, total, 1, want ? now : '', want ? comment : '']);
    return want ? 'want' : '';
  });

  if (first) {
    var p = PropertiesService.getScriptProperties();
    sendTelegram(p.getProperty('TELEGRAM_TOKEN'), p.getProperty('TELEGRAM_CHAT_ID'),
      '📞 <b>Просит связаться (меньше ' + MIN_ORDER + ' шт, по наличию)</b>\n👤 ' + esc(user.name) + '\n📞 ' + esc(user.phone) +
      '\n\n' + esc(summary) + '\n\n<b>Всего: ' + totalQty + ' шт, ' + fmt(total) + ' ₽</b>' + (comment ? '\n💬 ' + esc(comment) : ''));
  }
  return { ok: true };
}

function leadsSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SH_LEADS);
  if (sh) return sh;
  sh = ss.insertSheet(SH_LEADS);
  sh.getRange(1, 1, 1, 10).setValues([['Телефон', 'ФИО', 'Первый раз', 'Последний раз', 'Что выбрал',
    'Всего, шт', 'Сумма, ₽', 'Попыток', 'Просит связаться', 'Комментарий']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange('C:D').setNumberFormat('dd.MM.yyyy H:mm');
  sh.getRange('I:I').setNumberFormat('dd.MM.yyyy H:mm');
  sh.getRange('G:G').setNumberFormat('#,##0 ₽');
  sh.getRange('E:E').setWrap(true);
  sh.setColumnWidth(5, 260);
  return sh;
}

/* =================== Уведомления покупателям в Telegram =================== */

// Кабинет → «Получать уведомления в Telegram»: даём ссылку t.me/<бот>?start=<код>.
// Покупатель нажимает «Старт» — бот получает код, и мы запоминаем его chat_id (лист «Покупатели», J).
function apiTgLink(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');
  var bot = tgBotName();
  if (!bot) return fail('Уведомления временно недоступны');
  var code = randomHex(8);
  CacheService.getScriptCache().put('tglink_' + code, user.phone, 3600);
  return { ok: true, url: 'https://t.me/' + bot + '?start=' + code };
}

// Кабинет спрашивает, подключился ли покупатель (после нажатия «Старт» в боте)
function apiTgCheck(b) {
  var user = userByToken(b.token);
  if (!user) return fail('Войдите снова', 'auth');
  if (!user.tg) { try { tgPoll(); } catch (e) { console.warn(e); } }
  var u = findUserRow(user.phone);
  return { ok: true, tg: !!(u && u.values[USER_TG_COL - 1]) };
}

function tgBotName() {
  var p = PropertiesService.getScriptProperties();
  var name = p.getProperty('TELEGRAM_BOT_NAME');
  if (name) return name;
  var token = p.getProperty('TELEGRAM_TOKEN');
  if (!token) return '';
  try {
    var r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getMe', { muteHttpExceptions: true }).getContentText());
    name = r.ok ? r.result.username : '';
    if (name) p.setProperty('TELEGRAM_BOT_NAME', name);
  } catch (e) { console.warn('getMe: ' + e); }
  return name || '';
}

// Читаем новые сообщения боту (getUpdates). Нужны только «/start <код>» от покупателей.
function tgPoll() {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('TELEGRAM_TOKEN');
  if (!token) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var offset = Number(p.getProperty('TG_OFFSET') || 0);
    var r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates?timeout=0&offset=' + offset +
      '&allowed_updates=' + encodeURIComponent('["message"]'), { muteHttpExceptions: true }).getContentText());
    if (!r.ok) { console.warn('getUpdates: ' + JSON.stringify(r)); return; }
    var cache = CacheService.getScriptCache();
    r.result.forEach(function (u) {
      offset = Math.max(offset, u.update_id + 1);
      var m = u.message;
      if (!m || !m.chat || m.chat.type !== 'private') return;
      var mt = String(m.text || '').match(/^\/start\s+([0-9a-f]{16})$/);
      if (!mt) return;
      var phone = cache.get('tglink_' + mt[1]);
      if (!phone) {
        sendTelegram(token, m.chat.id, 'Ссылка устарела. Откройте личный кабинет на сайте и нажмите «Получать уведомления в Telegram» ещё раз.');
        return;
      }
      cache.remove('tglink_' + mt[1]);
      var found = findUserRow(phone);
      if (!found) return;
      sheet(SH_USERS).getRange(found.row, USER_TG_COL).setValue(String(m.chat.id));
      sendTelegram(token, m.chat.id, '🌷 Готово! Сюда будут приходить уведомления о ваших заказах Тюльпан03: ' +
        'когда заказ примут, когда поступит оплата и когда заказ будет выдан.');
    });
    p.setProperty('TG_OFFSET', String(offset));
  } finally { lock.releaseLock(); }
}

// Лист «Уведомления»: последнее, о чём покупатель уже знает (статус, оплачено, выдан).
// Раз в 5 минут (warmBook2027) сравниваем с таблицей 2027 и пишем покупателю, что изменилось.
function snapSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SH_NOTIFY);
  if (sh) return { sh: sh, fresh: false };
  sh = ss.insertSheet(SH_NOTIFY);
  sh.getRange(1, 1, 1, 4).setValues([['№ заказа', 'Статус', 'Оплачено', 'Выдан']]).setFontWeight('bold');
  sh.hideSheet();
  return { sh: sh, fresh: true };
}
function snapAll() {
  var o = snapSheet(), map = {};
  var n = o.sh.getLastRow() - 1;
  if (n > 0) o.sh.getRange(2, 1, n, 4).getValues().forEach(function (r, i) {
    map[Number(r[0])] = { row: i + 2, st: String(r[1]), paid: Number(r[2]) || 0, issued: r[3] === true };
  });
  return { sh: o.sh, fresh: o.fresh, map: map };
}
function snapSet(num, v) {
  var s = snapAll();
  var row = s.map[num] ? s.map[num].row : s.sh.getLastRow() + 1;
  s.sh.getRange(row, 1, 1, 4).setValues([[num, v.st, v.paid, !!v.issued]]);
}

function notifyCustomers() {
  var book = book2027();
  if (!book.st || !book.cols) return;
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty('TELEGRAM_TOKEN');
  var s = snapAll();
  var chats = {};
  rows(SH_USERS).forEach(function (u) { if (u[USER_TG_COL - 1]) chats[String(u[0])] = String(u[USER_TG_COL - 1]); });
  var updates = [];
  rows(SH_ORDERS).forEach(function (r) {
    var num = Number(r[0]);
    if (!num) return;
    var c = book.cols.filter(function (x) { return x.siteNum === num; })[0];
    var cur = { st: book.st[num] || 'Новый', paid: c ? c.paid : 0, issued: c ? c.issued : false, total: c ? c.total : Number(r[6]) || 0 };
    var old = s.map[num];
    if (old && old.st === cur.st && old.paid === cur.paid && old.issued === cur.issued) return;
    updates.push([num, cur.st, cur.paid, cur.issued, old ? old.row : 0]);
    var chat = chats[String(r[3])];
    if (!old || s.fresh || !chat || !token) return; // первый запуск — только запоминаем, ничего не шлём
    var msgs = [];
    if (old.st !== cur.st && cur.st === 'Подтверждён') {
      msgs.push('✅ <b>Заказ №' + num + ' принят!</b>\nСумма: ' + fmt(cur.total) + ' ₽.\n' +
        'Предоплата 50%, остальное — при получении. Самовывоз: Улан-Удэ, ул. Тобольская, 167А.');
    }
    if (old.st !== cur.st && cur.st === 'Отменён') {
      msgs.push('Заказ №' + num + ' отменён. Если это ошибка — напишите нам в Telegram @tulpan03.');
    }
    if (cur.paid > old.paid && cur.st !== 'Отменён') {
      var left = Math.max(0, cur.total - cur.paid);
      msgs.push('💳 <b>Оплата по заказу №' + num + ' получена.</b>\nОплачено: ' + fmt(cur.paid) + ' ₽' +
        (left ? ', осталось: ' + fmt(left) + ' ₽.' : ' — заказ оплачен полностью.'));
    }
    if (cur.issued && !old.issued) {
      msgs.push('🌷 <b>Заказ №' + num + ' выдан.</b> Спасибо, что выбрали Тюльпан03!');
    }
    if (msgs.length) sendTelegram(token, chat, msgs.join('\n\n') + '\n\nВсе заказы — в личном кабинете: ' + SITE_URL);
  });
  updates.forEach(function (u) {
    var row = u[4] || s.sh.getLastRow() + 1;
    s.sh.getRange(row, 1, 1, 4).setValues([[u[0], u[1], u[2], u[3]]]);
  });
}

/* =================== Уведомления =================== */

function notifyOwner(number, name, phone, lines, qty, total, comment, channel, hasAccount) {
  var html = '🌷 <b>Новый заказ №' + number + '</b>\n\n' +
    '👤 ' + esc(name) + (hasAccount ? ' (личный кабинет)' : '') + '\n' +
    '📞 ' + esc(phone) + '\n\n' +
    lines.map(function (l) { return '• ' + esc(l.name) + ': ' + l.qty + ' шт × ' + l.price + ' ₽ = ' + fmt(l.sum) + ' ₽'; }).join('\n') +
    '\n\n<b>Всего: ' + qty + ' шт, ' + fmt(total) + ' ₽</b>' +
    (comment ? '\n💬 ' + esc(comment) : '') +
    '\n\nКлиент выбрал: ' + channel;
  var p = PropertiesService.getScriptProperties();
  sendTelegram(p.getProperty('TELEGRAM_TOKEN'), p.getProperty('TELEGRAM_CHAT_ID'), html);
  sendMax(p.getProperty('MAX_TOKEN'), p.getProperty('MAX_USER_ID'), html);
}

function sendTelegram(token, chatId, html) {
  if (!token || !chatId) return false;
  try {
    var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', muteHttpExceptions: true,
      payload: { chat_id: String(chatId), text: html, parse_mode: 'HTML', disable_web_page_preview: 'true' }
    });
    if (r.getResponseCode() !== 200) console.warn('Telegram: ' + r.getContentText());
    return r.getResponseCode() === 200;
  } catch (err) { console.warn('Telegram: ' + err); return false; }
}

function sendMax(token, userId, html) {
  if (!token || !userId) return false;
  try {
    var r = UrlFetchApp.fetch('https://platform-api2.max.ru/messages?user_id=' + encodeURIComponent(userId), {
      method: 'post', muteHttpExceptions: true, contentType: 'application/json',
      headers: { Authorization: token },
      payload: JSON.stringify({ text: html, format: 'html' })
    });
    if (r.getResponseCode() !== 200) console.warn('MAX: ' + r.getContentText());
    return r.getResponseCode() === 200;
  } catch (err) { console.warn('MAX: ' + err); return false; }
}

/* ======== Запускаются вручную из редактора (кнопка «Выполнить») ======== */

// 1) Напишите своему Telegram-боту любое сообщение, затем запустите эту функцию.
//    В «Журнале выполнения» появится ваш chat_id — впишите его в TELEGRAM_CHAT_ID.
function findTelegramChatId() {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) throw new Error('Сначала добавьте TELEGRAM_TOKEN в свойства скрипта');
  var r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates').getContentText());
  (r.result || []).forEach(function (u) {
    var m = u.message || u.edited_message;
    if (m) console.log('chat_id = ' + m.chat.id + '  (' + (m.chat.first_name || m.chat.title || '') + ')');
  });
  if (!(r.result || []).length) console.log('Сообщений нет. Напишите боту /start и запустите ещё раз.');
}

// 2) Напишите своему боту в MAX любое сообщение, затем запустите эту функцию.
function findMaxUserId() {
  var token = PropertiesService.getScriptProperties().getProperty('MAX_TOKEN');
  if (!token) throw new Error('Сначала добавьте MAX_TOKEN в свойства скрипта');
  var r = JSON.parse(UrlFetchApp.fetch('https://platform-api2.max.ru/updates?limit=50&timeout=0', {
    headers: { Authorization: token }, muteHttpExceptions: true
  }).getContentText());
  (r.updates || []).forEach(function (u) {
    var s = (u.message && u.message.sender) || u.user;
    if (s) console.log('user_id = ' + s.user_id + '  (' + (s.name || s.first_name || '') + ')');
  });
  if (!(r.updates || []).length) console.log('Сообщений нет. Напишите боту в MAX и запустите ещё раз.');
}

// 3) Проверка уведомлений: присылает тестовое сообщение во все подключённые мессенджеры
function testNotify() {
  var p = PropertiesService.getScriptProperties();
  var text = '✅ Тюльпан03: уведомления о заказах работают';
  console.log('Telegram: ' + (sendTelegram(p.getProperty('TELEGRAM_TOKEN'), p.getProperty('TELEGRAM_CHAT_ID'), text) ? 'отправлено' : 'не настроен или ошибка'));
  console.log('MAX: ' + (sendMax(p.getProperty('MAX_TOKEN'), p.getProperty('MAX_USER_ID'), text) ? 'отправлено' : 'не настроен или ошибка'));
}

/* =================== Служебное =================== */

function sheet(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Нет листа «' + name + '»');
  return sh;
}

function readStatusMap(ss) {
  try {
    var sh = ss.getSheetByName(STATUS_SHEET);
    var n = sh.getLastRow() - 1;
    if (n < 1) return {};
    var map = {};
    sh.getRange(2, 1, n, 11).getValues().forEach(function (r) {
      var s = String(r[10] || '').trim();
      if (r[0] !== '' && s) map[Number(r[0])] = s;
    });
    return map;
  } catch (e) {
    return null;
  }
}

function rows(name) {
  var sh = sheet(name);
  var n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, sh.getLastColumn()).getValues() : [];
}

function findUserRow(phone) {
  var all = rows(SH_USERS);
  for (var i = 0; i < all.length; i++) {
    if (String(all[i][0]) === phone) return { row: i + 2, values: all[i] };
  }
  return null;
}

function updateUserStats(phone) {
  var u = findUserRow(phone);
  if (!u) return;
  var count = 0, sum = 0;
  rows(SH_ORDERS).forEach(function (r) {
    if (r[3] === phone && r[10] !== 'Отменён') { count++; sum += Number(r[6]) || 0; }
  });
  sheet(SH_USERS).getRange(u.row, 5, 1, 2).setValues([[count, sum]]);
}

function createSession(phone) {
  var token = randomHex(32);
  var now = new Date();
  sheet(SH_SESSIONS).appendRow([sha256(token), asText(phone), now, now]);
  return token;
}

function findSession(token) {
  if (!token || String(token).length < 32) return null;
  var h = sha256(String(token));
  var all = rows(SH_SESSIONS);
  for (var i = 0; i < all.length; i++) {
    if (all[i][0] === h) return { row: i + 2, values: all[i] };
  }
  return null;
}

function userByToken(token) {
  var s = findSession(token);
  if (!s) return null;
  var lastUsed = new Date(s.values[3]);
  if (Date.now() - lastUsed.getTime() > SESSION_DAYS * 864e5) {
    sheet(SH_SESSIONS).deleteRow(s.row);
    return null;
  }
  var u = findUserRow(String(s.values[1]));
  if (!u) return null;
  // Отмечаем использование не чаще раза в сутки, чтобы не писать в таблицу на каждый запрос
  if (Date.now() - lastUsed.getTime() > 864e5) sheet(SH_SESSIONS).getRange(s.row, 4).setValue(new Date());
  return { phone: String(u.values[0]), name: String(u.values[1]), verified: !!u.values[USER_VERIFIED_COL - 1],
           tg: String(u.values[USER_TG_COL - 1] || ''), row: u.row };
}

function loadPrices() {
  var cache = CacheService.getScriptCache();
  var src = cache.get('prices_js');
  if (!src) {
    src = UrlFetchApp.fetch(PRICES_URL).getContentText();
    cache.put('prices_js', src, 600);
  }
  // prices.js — наш собственный файл из репозитория сайта
  var tiers = new Function(src + '\n;return PRICE_TIERS;')();
  if (!tiers || !tiers.smooth) throw new Error('Не удалось прочитать цены');
  return tiers;
}

function priceFor(tiers, type, totalQty) {
  var list = tiers[type] || tiers.smooth;
  for (var i = 0; i < list.length; i++) {
    if (totalQty >= list[i].min && totalQty <= list[i].max) return list[i].price;
  }
  return list[list.length - 1].price;
}

// +7 914 841-61-15 — единый вид номера в таблице
function normPhone(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length === 10 && d[0] === '9') d = '7' + d;
  if (!/^7\d{10}$/.test(d)) return '';
  return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
}

function hashPassword(password, salt) {
  var h = salt + ':' + password;
  for (var i = 0; i < HASH_ROUNDS; i++) h = sha256(salt + h);
  return h;
}

function sha256(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function randomHex(bytes) {
  var s = '';
  while (s.length < bytes * 2) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, bytes * 2);
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Защита таблицы: текст, начинающийся с = + - @, не станет формулой
function clean(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0009\u000B-\u001F]/g, '').trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Телефон «+7 …» таблица иначе примет за формулу — апостроф делает его текстом (сам апостроф не виден)
function asText(v) {
  return "'" + String(v);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function toIso(d) {
  return d instanceof Date ? d.toISOString() : String(d);
}

function fail(message, code) {
  return { ok: false, error: message, code: code || '' };
}

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
 *    4. уведомления о новом заказе в Telegram и MAX.
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

/* =================== Точка входа =================== */

function doPost(e) {
  var res;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var handlers = {
      register: apiRegister, login: apiLogin, me: apiMe,
      logout: apiLogout, orders: apiOrders, order: apiOrder,
      claim: apiClaim, link: apiLink
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
  return { ok: true, orders: list, verified: !!user.verified };
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
  var hit = book.filter(function (c) { return c.phone === phone && c.code && c.code === code; })[0];
  if (!hit) {
    cache.put(key, String(fails + 1), 15 * 60);
    return { error: 'Неверный телефон или код. Проверьте накладную или напишите нам.' };
  }
  cache.remove(key);
  return { name: hit.name };
}

// Все покупатели с листа «Заказ» таблицы 2027
function bookColumns() {
  try {
    var sh = SpreadsheetApp.openById(STATUS_BOOK_ID).getSheetByName(BOOK_ORDER_SHEET);
    var v = sh.getRange(1, BK.firstCol, BK.rows, BK.cols).getValues();
    var tz = sh.getParent().getSpreadsheetTimeZone();
    var out = [];
    for (var j = 0; j < BK.cols; j++) {
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
    return num;
  });

  notifyOwner(number, name, phone, lines, totalQty, total, comment, channel, !!user);
  return { ok: true, number: number, total: total, qty: totalQty };
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

function statusMap2027() {
  try {
    var sh = SpreadsheetApp.openById(STATUS_BOOK_ID).getSheetByName(STATUS_SHEET);
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
  return { phone: String(u.values[0]), name: String(u.values[1]), verified: !!u.values[USER_VERIFIED_COL - 1] };
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

/**
 * =========================================================
 *  Тюльпан03 — сервер сайта (Google Apps Script)
 *
 *  Живёт внутри Google Таблицы «Тюльпан03 — заказы с сайта»:
 *  Расширения → Apps Script. Делает четыре вещи:
 *    1. регистрация и вход покупателей (телефон, ФИО, пароль);
 *    2. приём заказов с сайта в таблицу (листы «Заказы» и «Позиции»);
 *    3. история заказов для личного кабинета;
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
  'Красный': 'smooth', 'Красно-жёлтый': 'smooth', 'Красно-белый': 'smooth',
  'Бело-сиреневый': 'smooth', 'Бело-розовый': 'smooth', 'Фиолетовый': 'smooth',
  'Махровый жёлтый': 'terry', 'Махровый розовый': 'terry', 'Микс': 'mix'
};
var TYPE_NAMES = { smooth: 'Обычный', terry: 'Махровый', mix: 'Микс' };

var SESSION_DAYS = 365;        // сколько помнить вход на устройстве
var HASH_ROUNDS = 3000;        // сколько раз перемешивать пароль
var MAX_LOGIN_FAILS = 6;       // попыток входа за 15 минут

var SH_ORDERS = 'Заказы', SH_ITEMS = 'Позиции', SH_USERS = 'Покупатели', SH_SESSIONS = 'Сессии';

/* =================== Точка входа =================== */

function doPost(e) {
  var res;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var handlers = {
      register: apiRegister, login: apiLogin, me: apiMe,
      logout: apiLogout, orders: apiOrders, order: apiOrder
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
    sheet(SH_USERS).appendRow([phone, name, now, now, 0, 0, hashPassword(password, salt), salt]);
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

  var orders = rows(SH_ORDERS).filter(function (r) { return r[3] === user.phone; });
  var items = rows(SH_ITEMS);
  var list = orders.map(function (r) {
    var num = Number(r[0]);
    return {
      number: num,
      date: toIso(r[1]),
      total: Number(r[6]) || 0,
      qty: Number(r[5]) || 0,
      status: r[10] || 'Новый',
      comment: r[7] || '',
      items: items.filter(function (i) { return Number(i[0]) === num; }).map(function (i) {
        return { name: i[2], type: PRODUCTS[i[2]] || 'smooth', qty: Number(i[4]), price: Number(i[5]) };
      })
    };
  }).reverse();
  return { ok: true, orders: list };
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
    sh.appendRow([num, now, name, phone, summary, totalQty, total, comment, channel,
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
  sheet(SH_SESSIONS).appendRow([sha256(token), phone, now, now]);
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
  return { phone: String(u.values[0]), name: String(u.values[1]) };
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

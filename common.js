/* =========================================================
   ОБЩИЙ КОД ДЛЯ ВСЕХ СТРАНИЦ
   — аналитика (Яндекс.Метрика + Google Analytics)
   — корзина (хранится в браузере покупателя)
   — счётчик товаров в меню
   — всплывающие подсказки
   ========================================================= */

/* ---------- Аналитика ---------- */
const YM_ID = 113728893;
const GA_ID = 'G-Y7K52HYB39';

// Яндекс.Метрика
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  k=e.createElement(t);a=e.getElementsByTagName(t)[0];
  k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(YM_ID, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});

// Google Analytics
(function(){
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
})();
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', GA_ID);

// Цель: отмечаем важное действие в обеих системах.
// Названия целей: add_to_cart, open_cart, order_whatsapp, order_telegram, order_max
function goal(name){
  try { ym(YM_ID, 'reachGoal', name); } catch(e){}
  try { gtag('event', name); } catch(e){}
}

/* ---------- Корзина ---------- */
const CART_KEY = 'tulpan03_cart';

function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveCart(cart){
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){}
  updateCartBadge();
}
function cartTotalQty(cart){
  return (cart || loadCart()).reduce((s, i) => s + i.qty, 0);
}

// Счётчик в меню: «Корзина (240)»
function updateCartBadge(){
  const qty = cartTotalQty();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = qty > 0 ? qty.toLocaleString('ru-RU') : '';
    el.title = qty > 0 ? 'В корзине ' + qty + ' шт' : '';
    el.classList.toggle('has', qty > 0);
  });
}

/* ---------- Всплывающая подсказка ---------- */
function toast(text){
  let el = document.getElementById('toast');
  if (!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Цены в тексте страниц ----------
   <span class="min-price" data-type="smooth">86</span>  → самая низкая цена
   <span class="base-price" data-type="smooth">110</span> → цена за малый объём
   Числа внутри — запасные, на случай если скрипт не загрузится. */
function fillPrices(){
  if (typeof PRICE_TIERS === 'undefined') return;
  document.querySelectorAll('.min-price').forEach(el => el.textContent = minPrice(el.dataset.type));
  document.querySelectorAll('.base-price').forEach(el => el.textContent = basePrice(el.dataset.type));
}

/* =========================================================
   ЛИЧНЫЙ КАБИНЕТ И ПРИЁМ ЗАКАЗОВ
   Адрес сервера (Google Apps Script). Пока он пустой,
   личный кабинет на сайте скрыт, а заказы идут только в мессенджеры.
   ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbzmq9ahYDWDQ5kQTLZm58A2Q0V50S-w5n5Yvcyzhqps5oaDtNBQt5zZ-LiTCDNEIxJWFw/exec';

const SESSION_KEY = 'tulpan03_session';

function apiEnabled(){ return !!API_URL; }

// Запрос к серверу. text/plain — чтобы браузер не делал лишний предварительный запрос
async function api(action, data, timeoutMs){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 15000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, data || {})),
      signal: ctrl.signal
    });
    return await r.json();
  } catch(e){
    return { ok: false, error: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.', code: 'network' };
  } finally { clearTimeout(t); }
}

// Сессия хранится в браузере: при следующем визите пароль не нужен
function getSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch(e){ return null; }
}
function setSession(s){
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch(e){}
  updateAccountLink();
}

// Ссылка «Войти» / имя покупателя в шапке
function updateAccountLink(){
  const link = document.querySelector('.account-link');
  if (!link) return;
  link.hidden = !apiEnabled();
  const s = getSession();
  const label = link.querySelector('.account-word');
  if (label) label.textContent = s && s.name ? s.name.split(' ').filter(Boolean)[1] || s.name.split(' ')[0] : 'Войти';
  link.title = s ? 'Личный кабинет' : 'Войти или зарегистрироваться';
}

/* ---------- Номер телефона: +7 914 000-00-00 ----------
   Покупатель набирает 8 или 7 — сразу появляется +7.
   Набирает 9 — +7 подставляется перед ним. */
function formatPhone(digits){
  let d = digits.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1);
  else if (d[0] !== '7') d = '7' + d;
  d = d.slice(0, 11);
  let out = '+7';
  if (d.length > 1) out += ' ' + d.slice(1, 4);
  if (d.length > 4) out += ' ' + d.slice(4, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}
function attachPhoneMask(input){
  let prevDigits = input.value.replace(/\D/g, '');
  input.addEventListener('input', e => {
    let d = input.value.replace(/\D/g, '');
    // Стёрли пробел или дефис — стираем и цифру перед ним, иначе курсор «застрянет»
    if (e.inputType && e.inputType.startsWith('delete') && d === prevDigits && d.length) d = d.slice(0, -1);
    // Стёрли всё до «+7» — очищаем поле полностью
    if (e.inputType && e.inputType.startsWith('delete') && d === '7') d = '';
    input.value = formatPhone(d);
    prevDigits = input.value.replace(/\D/g, '');
  });
  if (input.value) { input.value = formatPhone(input.value); prevDigits = input.value.replace(/\D/g, ''); }
}

/* ---------- При загрузке страницы ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="tel"]').forEach(attachPhoneMask);
  fillPrices();
  updateCartBadge();
  updateAccountLink();
  document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());
});

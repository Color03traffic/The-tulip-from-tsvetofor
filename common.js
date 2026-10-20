/* =========================================================
   ОБЩИЙ КОД ДЛЯ ВСЕХ СТРАНИЦ
   — аналитика (Яндекс.Метрика + Google Analytics)
   — корзина (хранится в браузере покупателя)
   — счётчик товаров в меню
   — всплывающие подсказки
   ========================================================= */

/* ---------- Аналитика ---------- */
const YM_ID = 105324364;
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
// Названия целей: add_to_cart, open_cart, order_whatsapp, order_telegram
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

/* ---------- При загрузке страницы ---------- */
document.addEventListener('DOMContentLoaded', () => {
  fillPrices();
  updateCartBadge();
  document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());
});

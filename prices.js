/* =========================================================
   ЦЕНЫ И ПРАВИЛА ЗАКАЗА — ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ИХ МЕНЯТЬ
   Этот файл подключён и в каталоге, и в корзине, поэтому
   цены на сайте всегда совпадают.
   ========================================================= */

const QTY_STEP = 20;        // шаг количества, шт.
const PREORDER_MIN = 100;   // минимальный предзаказ, шт.

// Цена за штуку зависит от ОБЩЕГО количества тюльпанов в заказе.
// Пороги количества — одинаковые для всех периодов.
const PRICE_STEPS = [20, 500, 1000, 2000, 3000, 5000, 10000, 50000];

// ГРАФИК ЦЕН. Сайт сам переключается на новые цены в 00:00 по Иркутску
// в день «from». Цены совпадают с листом «Градация цен» в таблице 2027 —
// меняете там, меняйте и здесь (и наоборот).
// Порядок цен в каждом ряду — по порогам PRICE_STEPS (от 20 шт … от 50 000 шт).
const PRICE_SCHEDULE = [
  { from: '',           // до 1 января 2027
    smooth: [106, 95, 87, 86, 85, 84, 83, 82],   // гладкие
    terry:  [116, 105, 97, 96, 95, 94, 93, 92],  // махровые
    mix:    [105, 94, 86, 85, 84, 83, 82, 81] }, // микс
  { from: '2027-01-01', // с 1 января по 15 февраля 2027 включительно
    smooth: [112, 101, 93, 92, 91, 90, 89, 88],
    terry:  [122, 111, 103, 102, 101, 100, 99, 98],
    mix:    [110, 99, 91, 90, 89, 88, 87, 86] },
  { from: '2027-02-16', // с 16 февраля 2027
    smooth: [118, 107, 99, 98, 97, 96, 95, 94],
    terry:  [128, 117, 109, 108, 107, 106, 105, 104],
    mix:    [115, 104, 96, 95, 94, 93, 92, 91] }
];

// Сегодняшняя дата по Иркутску (UTC+8, без перехода на летнее время), вида 2027-01-01
function priceToday(){
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function tiersOf(period){
  const make = prices => prices.map((price, i) => ({
    min: PRICE_STEPS[i],
    max: i + 1 < PRICE_STEPS.length ? PRICE_STEPS[i + 1] - 1 : Infinity,
    price: price
  }));
  return { smooth: make(period.smooth), terry: make(period.terry), mix: make(period.mix) };
}

// Действующий сегодня период и его цены (их используют каталог, корзина и сервер)
const PRICE_PERIOD = PRICE_SCHEDULE.filter(p => p.from <= priceToday()).pop();
const PRICE_TIERS = tiersOf(PRICE_PERIOD);
// Следующая смена цен (или null), например для надписи «с 1 января цены …»
const NEXT_PRICE_PERIOD = PRICE_SCHEDULE.find(p => p.from > priceToday()) || null;

/* ---------- Функции, которые используют страницы ---------- */

// Цена за штуку для типа тюльпана при общем количестве totalQty
function priceFor(type, totalQty){
  const tiers = PRICE_TIERS[type] || PRICE_TIERS.smooth;
  for (const t of tiers){
    if (totalQty >= t.min && totalQty <= t.max) return t.price;
  }
  return tiers[tiers.length - 1].price;
}

// Самая низкая цена (для надписи «от … ₽»)
function minPrice(type){
  const tiers = PRICE_TIERS[type] || PRICE_TIERS.smooth;
  return tiers[tiers.length - 1].price;
}

// Розничная цена (самый маленький объём)
function basePrice(type){
  return (PRICE_TIERS[type] || PRICE_TIERS.smooth)[0].price;
}

// Количество: целое, не меньше шага, округляем ВВЕРХ до кратного шагу
function normalizeQty(v){
  v = parseInt(v, 10);
  if (isNaN(v) || v < QTY_STEP) v = QTY_STEP;
  return Math.ceil(v / QTY_STEP) * QTY_STEP;
}

// Форматирование числа: 12 500 ₽
function rub(n){
  return n.toLocaleString('ru-RU') + ' ₽';
}

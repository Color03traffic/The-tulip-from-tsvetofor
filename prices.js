/* =========================================================
   ЦЕНЫ И ПРАВИЛА ЗАКАЗА — ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ИХ МЕНЯТЬ
   Этот файл подключён и в каталоге, и в корзине, поэтому
   цены на сайте всегда совпадают.
   ========================================================= */

const QTY_STEP = 20;        // шаг количества, шт.
const PREORDER_MIN = 100;   // минимальный предзаказ, шт.

// Цена за штуку зависит от ОБЩЕГО количества тюльпанов в заказе.
// max: Infinity — значит «и больше».
const PRICE_TIERS = {
  // Все сорта, кроме махровых и микса
  smooth: [
    {min: 20,    max: 499,      price: 106},
    {min: 500,   max: 999,      price: 95},
    {min: 1000,  max: 1999,     price: 87},
    {min: 2000,  max: 2999,     price: 86},
    {min: 3000,  max: 4999,     price: 85},
    {min: 5000,  max: 9999,     price: 84},
    {min: 10000, max: 49999,    price: 83},
    {min: 50000, max: Infinity, price: 82}
  ],
  // Махровые
  terry: [
    {min: 20,    max: 499,      price: 116},
    {min: 500,   max: 999,      price: 105},
    {min: 1000,  max: 1999,     price: 97},
    {min: 2000,  max: 2999,     price: 96},
    {min: 3000,  max: 4999,     price: 95},
    {min: 5000,  max: 9999,     price: 94},
    {min: 10000, max: 49999,    price: 93},
    {min: 50000, max: Infinity, price: 92}
  ],
  // Микс
  mix: [
    {min: 20,    max: 499,      price: 105},
    {min: 500,   max: 999,      price: 94},
    {min: 1000,  max: 1999,     price: 86},
    {min: 2000,  max: 2999,     price: 85},
    {min: 3000,  max: 4999,     price: 84},
    {min: 5000,  max: 9999,     price: 83},
    {min: 10000, max: 49999,    price: 82},
    {min: 50000, max: Infinity, price: 81}
  ]
};

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

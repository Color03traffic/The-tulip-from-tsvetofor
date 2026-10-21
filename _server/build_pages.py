#!/usr/bin/env python3
"""Собирает 4 страницы сайта Тюльпан03 с общей шапкой и подвалом."""
import sys, os, urllib.parse
OUT = sys.argv[1]
U = 'https://xn--03-6kc7blkt5fq.xn--p1ai/'
PHONE_HREF = 'tel:+79148416115'
PHONE = '+7-914-841-61-15'
WA = 'https://wa.me/79148416115'
TG = 'https://t.me/tulpan03'
ADDR = 'Улан-Удэ, ул. Тобольская, 167А'
MAP = 'https://yandex.ru/maps/?text=' + urllib.parse.quote(ADDR)

ICON = {
 'logo': '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V17" stroke="#1E9E4A" stroke-width="2.4" stroke-linecap="round"/><path d="M16 23c-3.5-.4-6-2.4-7-5.6 3.4-.3 5.9 1.4 7 5.6z" fill="#1E9E4A"/><path d="M16 18.5c-4.6 0-8-3.3-8-8.2V4.6l4 3 4-4.6 4 4.6 4-3v5.7c0 4.9-3.4 8.2-8 8.2z" fill="#E54270"/><path d="M16 3v15.5" stroke="#C92C5A" stroke-width="1.4" opacity=".55"/></svg>',
 'bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
 'user': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
 'pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
 'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
 'tg': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 4.2 2.9 11.3c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.4-1.4zM9 14.3l9.4-5.9c.4-.3.8-.1.5.2l-7.8 7-.3 3.3z"/></svg>',
 'wa': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
}

def head(title, desc, path, extra='', robots=None, og_title=None, og_desc=None):
    canon = U + path
    rob = f'\n  <meta name="robots" content="{robots}">' if robots else ''
    og = '' if robots else f'''
  <link rel="canonical" href="{canon}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="Тюльпан03">
  <meta property="og:title" content="{og_title or title}">
  <meta property="og:description" content="{og_desc or desc}">
  <meta property="og:url" content="{canon}">
  <meta property="og:image" content="{U}tulips-new.jpg">'''
    d = f'\n  <meta name="description" content="{desc}">' if desc else ''
    return f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>{d}{rob}{og}
  <meta name="theme-color" content="#3E4158">

  <link rel="icon" type="image/png" sizes="32x32" href="favicon.png">
  <link rel="icon" href="favicon.ico" sizes="any">
  <link rel="apple-touch-icon" sizes="180x180" href="icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="style.css">
  <script src="prices.js"></script>
  <script src="common.js"></script>{extra}
</head>
'''

def header(active):
    items = [('index.html', 'Главная'), ('catalog.html', 'Каталог'), ('contacts.html', 'Контакты')]
    act = ' class="active" aria-current="page"'
    nav = ''.join('<a href="' + h + '"' + (act if h == active else '') + '>' + t + '</a>' for h, t in items)
    return f'''<body>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="index.html" aria-label="Тюльпан03 — на главную">{ICON['logo']}Тюльпан03</a>
    <nav class="nav" aria-label="Разделы сайта">{nav}</nav>
    <a class="account-link" href="account.html" hidden>{ICON['user']}<span class="account-word">Войти</span></a>
    <a class="cart-link" href="cart.html" aria-label="Корзина">{ICON['bag']}<span class="cart-word">Корзина</span><span class="cart-count"></span></a>
  </div>
</header>
'''

FOOTER = f'''
<footer class="site-footer">
  <div class="wrap">
    <a class="logo" href="index.html">{ICON['logo']}Тюльпан03</a>
    <div>© 2025–<span class="year">2026</span> Тюльпан03.рф — тюльпаны оптом в Улан-Удэ</div>
    <div class="footer-links"><a href="privacy.html">Политика конфиденциальности</a><a href="{PHONE_HREF}">{PHONE}</a></div>
  </div>
</footer>
'''

def contact_list():
    return f'''<div class="contact-list">
          <a href="{MAP}" target="_blank" rel="noopener">{ICON['pin']}{ADDR}</a>
          <a href="{PHONE_HREF}">{ICON['phone']}{PHONE}</a>
          <a href="{TG}" target="_blank" rel="noopener">{ICON['tg']}Telegram @tulpan03</a>
          <a href="{WA}" target="_blank" rel="noopener">{ICON['wa']}WhatsApp +79148416115</a>
        </div>'''

# ======================= ГЛАВНАЯ =======================
ld = f'''
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Florist",
    "name": "Тюльпан03",
    "description": "Краснодарские тюльпаны оптом в Улан-Удэ",
    "url": "{U}",
    "image": "{U}tulips-new.jpg",
    "telephone": "{PHONE}",
    "priceRange": "86–120 ₽ за шт.",
    "address": {{
      "@type": "PostalAddress",
      "streetAddress": "ул. Тобольская, 167А",
      "addressLocality": "Улан-Удэ",
      "addressRegion": "Республика Бурятия",
      "addressCountry": "RU"
    }},
    "sameAs": ["{TG}", "{WA}"]
  }}
  </script>'''

index = head('Тюльпаны оптом в Улан-Удэ от 86 ₽ — предзаказ к 8 Марта | Тюльпан03',
  'Краснодарские тюльпаны оптом в Улан-Удэ от бренда «Цветофор»: 13 расцветок, крупный бутон 5–7 см, стебель 45–60 см. Цена от 86 ₽ за штуку, предзаказ от 100 шт. Договор, любые способы оплаты.',
  '', ld, og_title='Тюльпаны оптом в Улан-Удэ — Тюльпан03',
  og_desc='Краснодарские тюльпаны оптом от 86 ₽ за штуку. 13 расцветок, предзаказ к 8 Марта.') + header('index.html') + f'''
<main>
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <div class="badge"><span class="badge-dot"></span>Принимаем предзаказы к 8 Марта</div>
        <h1>Тюльпаны оптом в <span class="nowrap">Улан-Удэ</span> <span class="nowrap">от <span class="min-price" data-type="smooth">86</span> ₽</span></h1>
        <p class="lead">Краснодарские тюльпаны — прямые поставки из теплиц Краснодарского края в Бурятию</p>
        <div class="hero-actions">
          <a href="catalog.html" class="btn">Выбрать тюльпаны и рассчитать цену</a>
          <a href="{WA}" class="btn btn-ghost" target="_blank" rel="noopener">{ICON['wa']}Написать в WhatsApp</a>
        </div>
      </div>
      <div class="buds" aria-label="Наши сорта">
        <figure class="bud" style="margin:0"><img src="pink.jpg" alt="Розовые тюльпаны" width="600" height="800"><span>Розовый</span></figure>
        <figure class="bud" style="margin:0"><img src="redyellow.jpg" alt="Красно-жёлтые тюльпаны" width="600" height="800"><span>Красно-жёлтый</span></figure>
        <figure class="bud" style="margin:0"><img src="yellow.jpg" alt="Жёлтые тюльпаны в теплице" width="354" height="472"><span>Жёлтый</span></figure>
        <figure class="bud" style="margin:0"><img src="violet.jpg" alt="Фиолетовые тюльпаны" width="800" height="600"><span>Фиолетовый</span></figure>
      </div>
    </div>
  </section>

  <section class="facts" aria-label="О тюльпанах">
    <div class="wrap">
      <div class="facts-grid">
        <div class="fact"><b>12+ лет</b><span>работает бренд «Цветофор»</span></div>
        <div class="fact"><b>5–7 см</b><span>крупные бутоны</span></div>
        <div class="fact"><b>45–60 см</b><span>высокий стебель</span></div>
        <div class="fact"><b>10+</b><span>расцветок</span></div>
      </div>
      <ul class="terms">
        <li>Проверенные сорта.</li>
        <li>Договоры, любые способы оплаты.</li>
        <li>При предоплате фиксируем цену.</li>
        <li>Предзаказ — от 100 шт. Меньше 100 шт — по наличию.</li>
        <li>Чем больше заказ, тем ниже цена: от <span class="base-price" data-type="smooth">110</span> ₽ до <span class="min-price" data-type="smooth">86</span> ₽ за штуку.</li>
      </ul>
    </div>
  </section>

  <section class="ladder-section">
    <div class="wrap">
      <div class="ladder-head">
        <div>
          <h2>Чем больше заказ, тем ниже цена</h2>
          <p class="muted">Цена за штуку зависит от общего количества тюльпанов в заказе. Однотонные и двухцветные сорта:</p>
        </div>
        <a href="catalog.html" class="btn btn-small">Рассчитать свой заказ</a>
      </div>
      <div class="ladder" id="ladder"></div>
      <p class="ladder-note muted"><span id="terryNote"></span>Все цены — в <a href="catalog.html#tiers">таблице в каталоге</a>.</p>
    </div>
  </section>

  <section class="contact-band">
    <div class="wrap">
      <div class="contact-card">
        <div>
          <h2>Контакты</h2>
          <p>Принимаем предварительные заказы на тюльпаны оптом. Лучше писать в мессенджеры — так быстрее отвечаем.</p>
        </div>
        {contact_list()}
      </div>
    </div>
  </section>
</main>
{FOOTER}
<script>
  // Лесенка цен: столбик растёт с объёмом, цена падает
  (function(){{
    const tiers = PRICE_TIERS.smooth;
    const fmt = n => n.toLocaleString('ru-RU');
    document.getElementById('ladder').innerHTML = tiers.map((t, i) => {{
      const h = 38 + i * (62 / (tiers.length - 1));
      const range = t.max === Infinity ? 'от ' + fmt(t.min) + ' шт' : fmt(t.min) + '–' + fmt(t.max) + ' шт';
      return '<div class="step' + (i === tiers.length - 1 ? ' top' : '') + '" style="height:' + h + '%">'
        + '<b>' + t.price + ' ₽</b><span>' + range + '</span></div>';
    }}).join('');
    // Насколько махровые дороже — считаем из prices.js
    const diffs = tiers.map((t, i) => PRICE_TIERS.terry[i].price - t.price);
    if (diffs.every(d => d === diffs[0]) && diffs[0] > 0)
      document.getElementById('terryNote').textContent = 'Махровые — на ' + diffs[0] + ' ₽ дороже. ';
  }})();
</script>
</body>
</html>
'''

# ======================= КАТАЛОГ =======================
cards = [
  ('smooth','one','Жёлтый','yellow','yellow.jpg','Жёлтый тюльпан', 354, 472),
  ('smooth','one','Белый','white','white.jpg','Белый тюльпан', 354, 472),
  ('smooth','one','Кремовый','cream','cream.jpg','Кремовый тюльпан', 800, 800),
  ('smooth','one','Розовый','pink','pink.jpg','Розовый тюльпан', 600, 800),
  ('smooth','one','Красный','red','red.jpg','Красный тюльпан', 354, 472),
  ('smooth','two','Красно-жёлтый','redyellow','redyellow.jpg','Красно-жёлтый тюльпан', 600, 800),
  ('smooth','two','Красно-белый','redwhite','redwhite.jpg','Красно-белый тюльпан', 600, 800),
  ('smooth','two','Бело-сиреневый','whiteviolet','whiteviolet.jpg','Бело-сиреневый тюльпан', 600, 800),
  ('smooth','two','Бело-розовый','whitepink','whitepink.jpg','Бело-розовый тюльпан', 800, 600),
  ('smooth','one','Фиолетовый','violet','violet.jpg','Фиолетовый тюльпан', 800, 600),
  ('terry','terry','Махровый жёлтый','mah-yellow','mahrovy-yellow.jpg','Махровый жёлтый тюльпан', 427, 320),
  ('terry','terry','Махровый розовый','mah-pink','mahrovy-rozovyj.jpg','Махровый розовый тюльпан', 600, 800),
  ('mix','mix','Микс','mix', None, 'Микс тюльпанов разных цветов', 0, 0),
]
static = {'smooth':(110,86),'terry':(120,96),'mix':(110,86)}
group_tag = {'one':'Однотонный','two':'Двухцветный','terry':'Махровый','mix':'Ассорти'}
card_html = []
for i,(t,g,name,id_,img,alt,w,h) in enumerate(cards):
    lazy = '' if i < 4 else ' loading="lazy"'
    r,o = static[t]
    if img:
        photo = f'<div class="card-photo"><img src="{img}" alt="{alt}" width="{w}" height="{h}"{lazy}><span class="tag{" terry" if g=="terry" else ""}">{group_tag[g]}</span></div>'
    else:
        photo = f'''<div class="card-photo mix-photo" role="img" aria-label="{alt}">
            <img src="red.jpg" alt=""{lazy}><img src="whiteviolet.jpg" alt=""{lazy}>
            <img src="yellow.jpg" alt=""{lazy}><img src="pink.jpg" alt=""{lazy}>
            <div class="mix-text">Выбор расцветки на наше усмотрение!<small>Не менее 5 сортов.</small></div>
          </div>'''
    card_html.append(f'''      <article class="card" data-type="{t}" data-group="{g}">
        {photo}
        <div class="card-body">
          <h3>{name}</h3>
          <div class="price-line"><span class="retail">{r} ₽/шт</span><span class="opt">опт — от {o} ₽/шт</span></div>
          <div class="card-actions">
            <div class="stepper">
              <button type="button" aria-label="Меньше" onclick="changeQty('qty-{id_}',-QTY_STEP)">−</button>
              <input id="qty-{id_}" value="20" inputmode="numeric" aria-label="{name}: количество, шт" onblur="handleManual('qty-{id_}')">
              <button type="button" aria-label="Больше" onclick="changeQty('qty-{id_}',QTY_STEP)">+</button>
            </div>
            <button class="btn" type="button" onclick="addToCart('{t}','{name}','qty-{id_}')">В корзину</button>
          </div>
        </div>
      </article>
''')

catalog = head('Каталог тюльпанов оптом — цены от 86 ₽ | Тюльпан03, Улан-Удэ',
  '13 расцветок тюльпанов оптом в Улан-Удэ: однотонные, двухцветные, махровые и микс. Цена от 86 ₽ за штуку, скидки за объём. Предзаказ к 8 Марта.',
  'catalog.html', og_title='Каталог тюльпанов оптом — Тюльпан03',
  og_desc='13 расцветок, цена от 86 ₽ за штуку, скидки за объём. Улан-Удэ.') + header('catalog.html') + f'''
<main class="wrap">
  <section class="page-head">
    <h1>Каталог тюльпанов</h1>
    <div class="note">
      Цена за штуку зависит от <b>общего количества</b> в заказе — чем больше, тем дешевле (<a href="#tiers">таблица ниже</a>).<br>
      Количество — кратно 20 шт. Предзаказ — от 100 шт. Меньше 100 шт — продаём по наличию.
    </div>
  </section>

  <div class="filters" role="group" aria-label="Показать сорта">
    <button class="chip" type="button" data-filter="all" aria-pressed="true">Все</button>
    <button class="chip" type="button" data-filter="one" aria-pressed="false">Однотонные</button>
    <button class="chip" type="button" data-filter="two" aria-pressed="false">Двухцветные</button>
    <button class="chip" type="button" data-filter="terry" aria-pressed="false">Махровые</button>
    <button class="chip" type="button" data-filter="mix" aria-pressed="false">Микс</button>
  </div>

  <div class="grid">
{''.join(card_html)}  </div>

  <section class="tiers" id="tiers">
    <h2>Цены за объём</h2>
    <p class="muted">Считается общее количество всех тюльпанов в заказе, цена за штуку.</p>
    <div class="tiers-wrap">
      <table class="tiers-table">
        <thead><tr><th>Общее количество</th><th>Однотонные и двухцветные</th><th>Махровые</th><th>Микс</th></tr></thead>
        <tbody id="tiersBody"></tbody>
      </table>
    </div>
  </section>
</main>
{FOOTER}
<div class="cart-bar" id="cartBar">
  <div class="cart-bar-inner">
    <div class="cart-bar-sum"><b id="barTotal">0 ₽</b><span id="barQty"></span></div>
    <a class="btn" href="cart.html">Оформить заказ</a>
  </div>
</div>

<script>
  // Цены на карточках — из prices.js, поэтому всегда совпадают с корзиной
  document.querySelectorAll('.card[data-type]').forEach(card => {{
    const t = card.dataset.type;
    card.querySelector('.retail').textContent = basePrice(t) + ' ₽/шт';
    card.querySelector('.opt').textContent = 'опт — от ' + minPrice(t) + ' ₽/шт';
  }});

  // Таблица цен за объём
  (function(){{
    const fmt = n => n.toLocaleString('ru-RU');
    document.getElementById('tiersBody').innerHTML = PRICE_TIERS.smooth.map((t, i) => {{
      const range = t.max === Infinity ? 'от ' + fmt(t.min) : fmt(t.min) + ' – ' + fmt(t.max);
      return '<tr><td>' + range + ' шт</td><td>' + PRICE_TIERS.smooth[i].price + ' ₽</td><td>'
        + PRICE_TIERS.terry[i].price + ' ₽</td><td>' + PRICE_TIERS.mix[i].price + ' ₽</td></tr>';
    }}).join('');
  }})();

  // Фильтр сортов
  document.querySelectorAll('.chip').forEach(chip => {{
    chip.addEventListener('click', () => {{
      const f = chip.dataset.filter;
      document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === chip));
      document.querySelectorAll('.card').forEach(card => {{
        card.hidden = !(f === 'all' || card.dataset.group === f);
      }});
    }});
  }});

  function changeQty(inputId, delta){{
    const el = document.getElementById(inputId);
    el.value = Math.max(QTY_STEP, normalizeQty(el.value) + delta);
  }}
  function handleManual(inputId){{
    const el = document.getElementById(inputId);
    el.value = normalizeQty(el.value);
  }}

  function addToCart(type, name, inputId){{
    const qty = normalizeQty(document.getElementById(inputId).value);
    const cart = loadCart();
    const existing = cart.find(i => i.name === name && i.type === type);
    if (existing) existing.qty += qty; else cart.push({{name, type, qty}});
    saveCart(cart);
    toast('✓ ' + name + ': +' + qty + ' шт');
    goal('add_to_cart');
    updateBar();
  }}

  // Нижняя панель: сколько штук и на какую сумму
  function updateBar(){{
    const cart = loadCart();
    const qty = cartTotalQty(cart);
    const bar = document.getElementById('cartBar');
    bar.classList.toggle('visible', qty > 0);
    document.body.classList.toggle('has-cart-bar', qty > 0);
    if (!qty) return;
    const total = cart.reduce((s, i) => s + priceFor(i.type, qty) * i.qty, 0);
    document.getElementById('barTotal').textContent = rub(total);
    document.getElementById('barQty').textContent = 'В корзине ' + qty + ' шт';
  }}
  updateBar();
</script>
</body>
</html>
'''

# ======================= КОРЗИНА =======================
photos = {name: img for (t,g,name,id_,img,alt,w,h) in cards if img}
photos['Микс'] = 'mix-thumb'
photos_js = '{' + ', '.join(f"'{k}': '{v}'" for k,v in photos.items()) + '}'

cart = head('Корзина — Тюльпан03', None, 'cart.html', robots='noindex, follow') + header('cart.html') + f'''
<main class="wrap">
  <section class="page-head">
    <h1>Корзина</h1>
    <p class="muted" style="margin:10px 0 0">Количество кратно 20 шт. Цена за штуку зависит от общего количества в заказе.</p>
  </section>

  <div class="cart-grid">
    <div class="panel">
      <ul class="cart-items" id="cartItems"></ul>
      <div class="cart-tools" id="cartTools">
        <a href="catalog.html" class="btn btn-ghost btn-small">Добавить ещё сорта</a>
        <button class="link-btn" type="button" onclick="clearCart()">Очистить корзину</button>
      </div>
    </div>

    <aside class="panel summary" aria-label="Оформление заказа">
      <div class="total">
        <span>Итого</span>
        <b id="cartTotal">0 ₽</b>
      </div>
      <div class="total-qty" id="cartQty"></div>
      <div class="note next-tier" id="nextTier"></div>

      <h2>Данные покупателя</h2>
      <div class="who" id="whoBox" hidden>
        <div><b id="whoName"></b><span id="whoPhone"></span></div>
        <a href="account.html">Кабинет</a>
      </div>
      <div id="guestFields">
      <p class="login-hint" id="loginHint" hidden>Уже заказывали? <a href="account.html?next=cart">Войдите</a> — данные подставятся, а заказ сохранится в истории.</p>
      <div class="field">
        <label for="clientName">Имя или название организации *</label>
        <input id="clientName" autocomplete="name" placeholder="Иванов Иван или ИП Иванов">
      </div>
      <div class="field">
        <label for="clientPhone">Телефон *</label>
        <input id="clientPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 914 000-00-00">
      </div>
      </div>
      <div class="field">
        <label for="clientComment">Комментарий</label>
        <textarea id="clientComment" placeholder="К какой дате нужен заказ, самовывоз или доставка, пожелания"></textarea>
      </div>
      <label class="check" id="consentBox" hidden>
        <input type="checkbox" id="consent">
        <span>Согласен на обработку персональных данных по <a href="privacy.html" target="_blank">политике конфиденциальности</a></span>
      </label>

      <div class="send">
        <button class="btn btn-wa" type="button" onclick="startSend('whatsapp')">{ICON['wa']}Отправить в WhatsApp</button>
        <button class="btn btn-tg" type="button" onclick="startSend('telegram')">{ICON['tg']}Отправить в Telegram</button>
      </div>
      <p class="form-note" id="formNote">Без имени и телефона заказ не отправится.</p>
    </aside>
  </div>
</main>
{FOOTER}
<!-- Окно: предупреждение о минимальном заказе -->
<div id="warningModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle1">
  <div class="modal-window">
    <button class="modal-close" type="button" onclick="closeModal()" aria-label="Закрыть">&times;</button>
    <div id="modalStep1">
      <div class="modal-title" id="modalTitle1">Обратите внимание</div>
      <p class="modal-text">
        Минимальный предзаказ — от <strong>100 шт</strong>, не все цвета могут быть в наличии.<br><br>
        Если в заказе меньше 100 шт, продажа идёт <strong>по наличию</strong>.
      </p>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-small" type="button" onclick="closeModal()">Отмена</button>
        <button class="btn btn-small" type="button" id="confirmBtn" onclick="confirmSend()">Понятно, отправить</button>
      </div>
    </div>
    <div id="modalStep2" hidden>
      <div class="modal-title" id="step2Title">Заказ готов к отправке</div>
      <p class="modal-text">
        Нажмите кнопку ниже — откроется чат с нами в Telegram, а текст заказа скопируется.<br>
        Если поле сообщения пустое, нажмите в нём <strong>«Вставить»</strong> и отправьте.
      </p>
      <div class="modal-actions">
        <button class="btn btn-tg btn-small" type="button" onclick="openTelegram()">Открыть Telegram</button>
      </div>
    </div>
  </div>
</div>

<script>
  const WHATSAPP_PHONE = '79148416115';
  const TELEGRAM_USER  = 'tulpan03';
  const PHOTOS = {photos_js};

  let cart = loadCart();
  let pendingChannel = null;
  let pendingText = '';
  let pendingClient = null;
  const session = apiEnabled() ? getSession() : null;

  // Покупатель вошёл в кабинет — данные берём из кабинета
  (function initBuyer(){{
    if (session){{
      document.getElementById('whoBox').hidden = false;
      document.getElementById('guestFields').hidden = true;
      document.getElementById('whoName').textContent = session.name;
      document.getElementById('whoPhone').textContent = session.phone;
      document.getElementById('formNote').textContent = 'Заказ сохранится в истории в личном кабинете.';
    }} else if (apiEnabled()){{
      document.getElementById('loginHint').hidden = false;
      document.getElementById('consentBox').hidden = false;
    }}
  }})();

  function esc(s){{
    return String(s).replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}})[c]);
  }}
  function thumb(name){{
    const p = PHOTOS[name];
    if (p === 'mix-thumb') return '<img src="pink.jpg" alt="">';
    return p ? '<img src="' + p + '" alt="">' : '<img src="tulips-new.jpg" alt="">';
  }}

  function updateCart(){{
    saveCart(cart);
    const list = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const qtyEl = document.getElementById('cartQty');
    const nextEl = document.getElementById('nextTier');
    const tools = document.getElementById('cartTools');

    if (cart.length === 0){{
      list.innerHTML = '<li class="empty"><h3>Корзина пуста</h3><p class="muted">Выберите сорта в каталоге — цена посчитается автоматически.</p><a class="btn" href="catalog.html">Перейти в каталог</a></li>';
      tools.hidden = true;
      totalEl.textContent = '0 ₽';
      qtyEl.textContent = '';
      nextEl.textContent = '';
      return;
    }}
    tools.hidden = false;

    const totalQty = cartTotalQty(cart);
    let total = 0;
    list.innerHTML = cart.map((item, index) => {{
      const price = priceFor(item.type, totalQty);
      const sum = price * item.qty;
      total += sum;
      return `<li class="cart-item">
          ${{thumb(item.name)}}
          <div><h3>${{esc(item.name)}}</h3><div class="unit">${{price}} ₽ за шт</div></div>
          <div class="stepper">
            <button type="button" aria-label="Меньше" onclick="changeQty(${{index}}, -QTY_STEP)">−</button>
            <input value="${{item.qty}}" inputmode="numeric" aria-label="${{esc(item.name)}}: количество, шт" onchange="manualQtyChange(${{index}}, this.value)">
            <button type="button" aria-label="Больше" onclick="changeQty(${{index}}, QTY_STEP)">+</button>
          </div>
          <div class="sum">${{rub(sum)}}</div>
          <button class="remove" type="button" aria-label="Удалить ${{esc(item.name)}}" title="Удалить" onclick="removeItem(${{index}})">✕</button>
        </li>`;
    }}).join('');

    totalEl.textContent = rub(total);
    qtyEl.textContent = 'за ' + totalQty + ' шт';

    const tier = PRICE_TIERS.smooth.find(t => totalQty >= t.min && totalQty <= t.max);
    const next = PRICE_TIERS.smooth[PRICE_TIERS.smooth.indexOf(tier) + 1];
    nextEl.textContent = next
      ? 'Добавьте ещё ' + (next.min - totalQty) + ' шт — и цена снизится до ' + next.price + ' ₽/шт (обычные сорта).'
      : '';
  }}

  function changeQty(i, delta){{ cart[i].qty = Math.max(QTY_STEP, normalizeQty(cart[i].qty + delta)); updateCart(); }}
  function manualQtyChange(i, v){{ cart[i].qty = normalizeQty(v); updateCart(); }}
  function removeItem(i){{
    const name = cart[i].name;
    cart.splice(i, 1);
    updateCart();
    toast(name + ' — удалён из корзины');
  }}
  function clearCart(){{
    if (cart.length && !confirm('Удалить все товары из корзины?')) return;
    cart = [];
    updateCart();
  }}

  function validateClient(){{
    const comment = document.getElementById('clientComment').value.trim();
    if (cart.length === 0){{ toast('Корзина пуста'); return null; }}
    if (session) return {{name: session.name, phone: session.phone, comment}};
    const name    = document.getElementById('clientName').value.trim();
    const phone   = document.getElementById('clientPhone').value.trim();
    if (!name){{ toast('Введите имя'); document.getElementById('clientName').focus(); return null; }}
    if (phone.replace(/\\D/g, '').length < 10){{
      toast('Проверьте номер телефона');
      document.getElementById('clientPhone').focus();
      return null;
    }}
    if (apiEnabled() && !document.getElementById('consent').checked){{
      toast('Отметьте согласие на обработку данных');
      return null;
    }}
    return {{name, phone, comment}};
  }}

  function buildMessage(client, number){{
    const totalQty = cartTotalQty(cart);
    let total = 0;
    const lines = [(number ? 'Заказ №' + number : 'Заказ') + ' с сайта Тюльпан03', '-----------------',
                   'Имя: ' + client.name, 'Телефон: ' + client.phone, '-----------------'];
    cart.forEach(i => {{
      const price = priceFor(i.type, totalQty);
      const sum = price * i.qty;
      total += sum;
      lines.push(i.name + ': ' + i.qty + ' шт × ' + price + ' ₽ = ' + rub(sum));
    }});
    lines.push('-----------------');
    lines.push('Всего: ' + totalQty + ' шт, ' + rub(total));
    if (client.comment) lines.push('Комментарий: ' + client.comment);
    return lines.join('\\n');
  }}

  function startSend(channel){{
    const client = validateClient();
    if (!client) return;
    pendingChannel = channel;
    pendingClient = client;
    pendingText = buildMessage(client);
    document.getElementById('modalStep1').hidden = false;
    document.getElementById('modalStep2').hidden = true;
    document.getElementById('warningModal').classList.add('show');
  }}
  // Сохраняем заказ в таблицу (если сервер подключён), потом открываем мессенджер.
  // Если сервер недоступен — заказ всё равно уходит в мессенджер, чтобы не потерять покупателя.
  async function saveOrder(){{
    if (!apiEnabled()) return null;
    const res = await api('order', {{
      token: session ? session.token : undefined,
      name: pendingClient.name, phone: pendingClient.phone, comment: pendingClient.comment,
      consent: !session, channel: pendingChannel,
      items: cart.map(i => ({{name: i.name, type: i.type, qty: i.qty}}))
    }}, 12000);
    if (res.ok) return res.number;
    if (res.code === 'auth'){{ setSession(null); }}
    if (res.code !== 'network' && res.code !== 'auth' && !/сервер/i.test(res.error || '')){{
      throw new Error(res.error || 'Не удалось оформить заказ');
    }}
    return null;
  }}

  async function confirmSend(){{
    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.textContent = 'Оформляем…';
    let number = null;
    try {{
      number = await saveOrder();
    }} catch(e){{
      btn.disabled = false; btn.textContent = 'Понятно, отправить';
      closeModal(); toast(e.message);
      return;
    }}
    pendingText = buildMessage(pendingClient, number);
    if (number){{ cart = []; updateCart(); }}
    btn.disabled = false; btn.textContent = 'Понятно, отправить';

    if (pendingChannel === 'whatsapp'){{
      goal('order_whatsapp');
      closeModal();
      location.href = 'https://wa.me/' + WHATSAPP_PHONE + '?text=' + encodeURIComponent(pendingText);
      return;
    }}
    goal('order_telegram');
    if (number) document.getElementById('step2Title').textContent = 'Заказ №' + number + ' принят';
    document.getElementById('modalStep1').hidden = true;
    document.getElementById('modalStep2').hidden = false;
  }}
  function openTelegram(){{
    // Telegram не всегда подставляет текст из ссылки — копируем заказ в буфер (по нажатию, иначе браузер не даст)
    copyText(pendingText);
    closeModal();
    location.href = 'https://t.me/' + TELEGRAM_USER + '?text=' + encodeURIComponent(pendingText);
  }}
  function copyText(text){{
    if (navigator.clipboard && window.isSecureContext){{
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }} else {{ fallbackCopy(text); }}
  }}
  function fallbackCopy(text){{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try {{ document.execCommand('copy'); }} catch(e){{}}
    ta.remove();
  }}
  // Крестик, «Отмена», клик по фону и Esc — просто закрывают окно
  function closeModal(){{ document.getElementById('warningModal').classList.remove('show'); }}
  document.getElementById('warningModal').addEventListener('click', function(e){{ if (e.target === this) closeModal(); }});
  document.addEventListener('keydown', e => {{ if (e.key === 'Escape') closeModal(); }});

  goal('open_cart');
  updateCart();
</script>
</body>
</html>
'''

# ======================= КОНТАКТЫ =======================
contacts = head('Контакты — Тюльпан03, тюльпаны оптом в Улан-Удэ',
  'Тюльпан03: Улан-Удэ, ул. Тобольская, 167А. Телефон +7-914-841-61-15, Telegram @tulpan03, WhatsApp. Принимаем предзаказы на тюльпаны оптом.',
  'contacts.html', og_title='Контакты — Тюльпан03',
  og_desc='Улан-Удэ, ул. Тобольская, 167А. Телефон, Telegram, WhatsApp.') + header('contacts.html') + f'''
<main class="wrap">
  <section class="page-head">
    <h1>Контакты</h1>
  </section>

  <div class="contacts-grid">
    <div class="panel">
      <div class="contact-rows">
        <div class="contact-row">
          <div class="label">Адрес</div>
          <div class="value"><a href="{MAP}" target="_blank" rel="noopener">{ADDR}</a></div>
        </div>
        <div class="contact-row">
          <div class="label">Телефон</div>
          <div class="value"><a href="{PHONE_HREF}">{PHONE}</a></div>
        </div>
        <div class="contact-row">
          <div class="label">Мессенджеры</div>
          <div class="value"><a href="{TG}" target="_blank" rel="noopener">Telegram @tulpan03</a></div>
          <div class="value"><a href="{WA}" target="_blank" rel="noopener">WhatsApp +79148416115</a></div>
        </div>
      </div>
      <p class="note" style="margin:18px 0 0">
        Принимаем предварительные заказы на тюльпаны оптом. Лучше писать в мессенджеры —
        так быстрее отвечаем.
      </p>
      <div class="contact-actions">
        <a class="btn btn-wa" href="{WA}" target="_blank" rel="noopener">{ICON['wa']}WhatsApp</a>
        <a class="btn btn-tg" href="{TG}" target="_blank" rel="noopener">{ICON['tg']}Telegram</a>
        <a class="btn btn-ghost" href="{MAP}" target="_blank" rel="noopener">{ICON['pin']}Открыть на карте</a>
      </div>
    </div>
    <div class="contact-photo">
      <img src="tulips-new.jpg" alt="Букеты краснодарских тюльпанов разных цветов" width="1000" height="750" loading="lazy">
    </div>
  </div>
</main>
{FOOTER}
</body>
</html>
'''


# ======================= ЛИЧНЫЙ КАБИНЕТ =======================
account = head('Личный кабинет — Тюльпан03', None, 'account.html', robots='noindex, nofollow') + header('account.html') + f"""
<main class="wrap">
  <section class="page-head">
    <h1 id="accTitle">Личный кабинет</h1>
  </section>

  <div class="acc-off panel" id="accOff" hidden>
    <p>Личный кабинет скоро заработает. А пока заказ можно оформить в <a href="cart.html">корзине</a> — он придёт нам в WhatsApp или Telegram.</p>
  </div>

  <!-- Вход и регистрация -->
  <div class="auth" id="authBox" hidden>
    <div class="panel auth-panel">
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" id="tabLogin" aria-selected="true" aria-controls="loginForm" type="button">Вход</button>
        <button class="tab" role="tab" id="tabReg" aria-selected="false" aria-controls="regForm" type="button">Регистрация</button>
      </div>

      <form id="loginForm" novalidate>
        <div class="field">
          <label for="loginPhone">Телефон</label>
          <input id="loginPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 914 000-00-00" required>
        </div>
        <div class="field">
          <label for="loginPass">Пароль</label>
          <input id="loginPass" type="password" autocomplete="current-password" required>
        </div>
        <p class="form-error" id="loginError" role="alert"></p>
        <button class="btn" type="submit" style="width:100%">Войти</button>
        <p class="form-note">Забыли пароль? Напишите нам в <a href="{WA}" target="_blank" rel="noopener">WhatsApp</a> — поможем восстановить доступ.</p>
      </form>

      <form id="regForm" novalidate hidden>
        <div class="field">
          <label for="regName">ФИО или название организации</label>
          <input id="regName" autocomplete="name" placeholder="Иванов Иван Иванович" required>
        </div>
        <div class="field">
          <label for="regPhone">Телефон</label>
          <input id="regPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 914 000-00-00" required>
        </div>
        <div class="field">
          <label for="regPass">Пароль</label>
          <input id="regPass" type="password" autocomplete="new-password" minlength="6" placeholder="Не короче 6 символов" required>
        </div>
        <label class="check">
          <input type="checkbox" id="regConsent">
          <span>Согласен на обработку персональных данных по <a href="privacy.html" target="_blank">политике конфиденциальности</a></span>
        </label>
        <p class="form-error" id="regError" role="alert"></p>
        <button class="btn" type="submit" style="width:100%">Зарегистрироваться</button>
      </form>
    </div>
    <div class="auth-side">
      <h2>Зачем кабинет</h2>
      <ul class="terms">
        <li>Не нужно вводить имя и телефон при каждом заказе.</li>
        <li>Вся история заказов в одном месте.</li>
        <li>Прошлый заказ можно повторить в одно нажатие.</li>
        <li>Сайт запоминает вас на этом устройстве — пароль нужен только при первом входе.</li>
      </ul>
    </div>
  </div>

  <!-- Кабинет -->
  <div id="cabinet" hidden>
    <div class="panel acc-head">
      <div>
        <div class="acc-name" id="accName"></div>
        <div class="muted" id="accPhone"></div>
      </div>
      <div class="acc-actions">
        <a class="btn btn-small" href="catalog.html">Новый заказ</a>
        <button class="btn btn-ghost btn-small" type="button" id="logoutBtn">Выйти</button>
      </div>
    </div>
    <h2 class="acc-h2">Мои заказы</h2>
    <div id="orders" aria-live="polite"><p class="muted">Загружаем…</p></div>
  </div>
</main>
{FOOTER}
<script>
  const params = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}})[c]);

  function show(view){{
    $('accOff').hidden = view !== 'off';
    $('authBox').hidden = view !== 'auth';
    $('cabinet').hidden = view !== 'cabinet';
  }}

  function switchTab(reg){{
    $('tabLogin').setAttribute('aria-selected', !reg);
    $('tabReg').setAttribute('aria-selected', reg);
    $('loginForm').hidden = reg;
    $('regForm').hidden = !reg;
    $('accTitle').textContent = reg ? 'Регистрация' : 'Вход в личный кабинет';
  }}
  $('tabLogin').onclick = () => switchTab(false);
  $('tabReg').onclick = () => switchTab(true);

  function afterLogin(res){{
    setSession({{ token: res.token, name: res.user.name, phone: res.user.phone }});
    if (params.get('next') === 'cart') {{ location.href = 'cart.html'; return; }}
    openCabinet();
  }}

  async function submit(form, errEl, action, data, check){{
    errEl.textContent = '';
    const problem = check();
    if (problem){{ errEl.textContent = problem; return; }}
    const btn = form.querySelector('button[type=submit]');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Подождите…';
    const res = await api(action, data());
    btn.disabled = false; btn.textContent = label;
    if (!res.ok){{ errEl.textContent = res.error; return; }}
    afterLogin(res);
  }}

  $('loginForm').addEventListener('submit', e => {{
    e.preventDefault();
    submit($('loginForm'), $('loginError'), 'login',
      () => ({{ phone: $('loginPhone').value, password: $('loginPass').value }}),
      () => $('loginPhone').value.replace(/\\D/g,'').length < 10 ? 'Проверьте номер телефона'
          : !$('loginPass').value ? 'Введите пароль' : '');
  }});
  $('regForm').addEventListener('submit', e => {{
    e.preventDefault();
    submit($('regForm'), $('regError'), 'register',
      () => ({{ name: $('regName').value, phone: $('regPhone').value, password: $('regPass').value, consent: $('regConsent').checked }}),
      () => $('regName').value.trim().length < 2 ? 'Введите ФИО'
          : $('regPhone').value.replace(/\\D/g,'').length < 10 ? 'Проверьте номер телефона'
          : $('regPass').value.length < 6 ? 'Пароль — не короче 6 символов'
          : !$('regConsent').checked ? 'Отметьте согласие на обработку данных' : '');
  }});

  $('logoutBtn').onclick = async () => {{
    const s = getSession();
    setSession(null);
    if (s) api('logout', {{ token: s.token }});
    show('auth'); switchTab(false);
  }};

  const STATUS_CLASS = {{ 'Новый': 'st-new', 'Подтверждён': 'st-ok', 'Выполнен': 'st-done', 'Отменён': 'st-cancel' }};

  function renderOrders(orders){{
    if (!orders.length){{
      $('orders').innerHTML = '<div class="panel empty"><h3>Заказов пока нет</h3><p class="muted">Оформите первый заказ — он появится здесь.</p><a class="btn" href="catalog.html">Перейти в каталог</a></div>';
      return;
    }}
    $('orders').innerHTML = orders.map((o, idx) => {{
      const d = new Date(o.date);
      const date = isNaN(d) ? '' : d.toLocaleDateString('ru-RU', {{ day: 'numeric', month: 'long', year: 'numeric' }});
      const items = o.items.map(i => '<li><span>' + esc(i.name) + '</span><span>' + i.qty + ' шт × ' + i.price + ' ₽</span></li>').join('');
      return '<article class="panel order">'
        + '<div class="order-top"><div><b>Заказ №' + o.number + '</b><span class="muted">' + date + '</span></div>'
        + '<span class="status ' + (STATUS_CLASS[o.status] || 'st-new') + '">' + esc(o.status) + '</span></div>'
        + '<ul class="order-items">' + items + '</ul>'
        + (o.comment ? '<p class="muted order-comment">' + esc(o.comment.replace(/^\\'/, '')) + '</p>' : '')
        + '<div class="order-bottom"><span class="num">' + rub(o.total) + '</span><span class="muted">' + o.qty + ' шт</span>'
        + '<button class="btn btn-ghost btn-small" type="button" data-repeat="' + idx + '">Повторить заказ</button></div>'
        + '</article>';
    }}).join('');
    document.querySelectorAll('[data-repeat]').forEach(b => b.onclick = () => {{
      const o = orders[Number(b.dataset.repeat)];
      const cart = loadCart();
      o.items.forEach(i => {{
        const ex = cart.find(c => c.name === i.name && c.type === i.type);
        if (ex) ex.qty += i.qty; else cart.push({{ name: i.name, type: i.type, qty: i.qty }});
      }});
      saveCart(cart);
      location.href = 'cart.html';
    }});
  }}

  async function openCabinet(){{
    const s = getSession();
    show('cabinet');
    $('accTitle').textContent = 'Личный кабинет';
    $('accName').textContent = s.name;
    $('accPhone').textContent = s.phone;
    const res = await api('orders', {{ token: s.token }});
    if (!res.ok){{
      if (res.code === 'auth'){{ setSession(null); show('auth'); switchTab(false); $('loginError').textContent = 'Войдите снова, пожалуйста.'; return; }}
      $('orders').innerHTML = '<p class="form-error">' + esc(res.error) + '</p>';
      return;
    }}
    renderOrders(res.orders);
  }}

  if (!apiEnabled()) show('off');
  else if (getSession()) openCabinet();
  else {{ show('auth'); switchTab(params.get('tab') === 'reg'); }}
</script>
</body>
</html>
"""

# ======================= ПОЛИТИКА =======================
privacy = head('Политика конфиденциальности — Тюльпан03', 'Как сайт тюльпан03.рф обрабатывает и защищает персональные данные покупателей.', 'privacy.html') + header('') + f"""
<main class="wrap">
  <article class="panel prose">
    <h1>Политика обработки персональных данных</h1>
    <p class="muted">Редакция от 22 октября 2026 года</p>

    <h2>1. Кто обрабатывает данные</h2>
    <p>Оператор персональных данных — владелец сайта тюльпан03.рф (далее — «мы»). Адрес: {ADDR}. Телефон: <a href="{PHONE_HREF}">{PHONE}</a>.</p>

    <h2>2. Какие данные мы получаем</h2>
    <ul>
      <li>ФИО или название организации;</li>
      <li>номер телефона;</li>
      <li>состав, сумма и комментарий к заказу;</li>
      <li>пароль от личного кабинета — только в зашифрованном виде, мы не можем его прочитать;</li>
      <li>обезличенные данные о посещении сайта (Яндекс.Метрика, Google Analytics).</li>
    </ul>

    <h2>3. Зачем</h2>
    <p>Чтобы принять и выполнить заказ, связаться с вами по нему, вести историю заказов в личном кабинете и улучшать сайт.</p>

    <h2>4. Основание</h2>
    <p>Ваше согласие, которое вы даёте, отмечая галочку при регистрации или оформлении заказа, а также исполнение договора поставки (ст. 6 Федерального закона № 152-ФЗ «О персональных данных»).</p>

    <h2>5. Как мы храним и защищаем данные</h2>
    <p>Данные хранятся в защищённой учётной записи оператора, доступ к ним есть только у сотрудников, которые обрабатывают заказы. Мы не продаём и не передаём данные третьим лицам, кроме случаев, предусмотренных законом. Если вы сами выбираете отправку заказа через WhatsApp, Telegram или MAX, текст заказа передаётся через выбранный вами мессенджер.</p>

    <h2>6. Сколько храним</h2>
    <p>Пока у вас есть личный кабинет, либо 3 года с последнего заказа, если кабинета нет. Затем данные удаляются.</p>

    <h2>7. Ваши права</h2>
    <p>Вы можете узнать, какие данные о вас хранятся, исправить их, отозвать согласие и попросить удалить данные и личный кабинет. Для этого напишите нам в <a href="{WA}" target="_blank" rel="noopener">WhatsApp</a> или <a href="{TG}" target="_blank" rel="noopener">Telegram</a>, либо позвоните по телефону <a href="{PHONE_HREF}">{PHONE}</a>. Мы ответим в течение 10 рабочих дней.</p>

    <h2>8. Cookie и аналитика</h2>
    <p>Сайт использует cookie и хранилище браузера, чтобы помнить корзину и вход в личный кабинет, и сервисы Яндекс.Метрика и Google Analytics для обезличенной статистики посещений. Вы можете отключить cookie в настройках браузера.</p>
  </article>
</main>
{FOOTER}
</body>
</html>
"""

for name, html in [('index.html', index), ('catalog.html', catalog), ('cart.html', cart), ('contacts.html', contacts), ('account.html', account), ('privacy.html', privacy)]:
    open(os.path.join(OUT, name), 'w', encoding='utf-8').write(html)
print('ok')

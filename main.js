/* ============================================================
   WEBNICSS — движок студийного лендинга
   GSAP + ScrollTrigger + Lenis (с фолбэком, если библиотеки не загрузились)
   ============================================================ */
'use strict';
window.__wnBoot = true;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Доступ к хранилищу браузера может быть запрещён. Это не должно ломать витрину.
const storageGet = (kind, key) => { try { return window[kind].getItem(key); } catch (_) { return null; } };
const storageSet = (kind, key, value) => { try { window[kind].setItem(key, value); return true; } catch (_) { return false; } };
const storageRemove = (kind, key) => { try { window[kind].removeItem(key); } catch (_) {} };
const money = n => n.toLocaleString('ru-RU') + ' ₽';
const goodPrice = g => Number.isFinite(g.price) ? money(g.price) : 'по запросу';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = !!(window.gsap && window.ScrollTrigger && window.Lenis);
if (!hasGsap) {
  document.documentElement.classList.add('no-gsap');
  // фолбэк: без анимационной библиотеки сразу снимаем прелоадер,
  // чтобы страница не осталась чёрной (офлайн, превью, блокировка CDN)
  document.documentElement.classList.add('loader-skip');
  const killLoader = () => {
    document.body?.classList.remove('is-loading');
    const pre = $('.loader');
    if (pre) pre.style.display = 'none';
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', killLoader);
  else killLoader();
}

/* ---------- прелоадер: показываем только на первом визите сессии ---------- */
const loaderSeen = storageGet('sessionStorage', 'wn_loader') === '1';
if (loaderSeen) {
  document.documentElement.classList.add('loader-skip');
  document.body?.classList.remove('is-loading');
  const pre = $('.loader'); if (pre) pre.style.display = 'none';
}

/* ============================================================
   ДАННЫЕ
   ============================================================ */
const MENU = [
  ['Главная', 'index.html'],
  ['Проекты', 'projects.html#projects-list'],
  ['Витрина', 'shop.html#catalog'],
  ['Услуги', 'service.html#sites'],
  ['Команда', 'index.html#team'],
  ['Контакт', 'index.html#contact'],
];
const here = location.pathname.split('/').pop() || 'index.html';

/* ============================================================
   КОНВЕЙЕР НАПРАВЛЕНИЙ — 4 карточки услуг в бегущей ленте
   ============================================================ */
const DIRECTIONS = [
  {
    title: 'Бизнес', href: 'service.html#sites',
    text: 'Сайты, Telegram-боты, Mini Apps и реклама — инструменты, которые приносят заявки и продажи',
    link: 'Смотреть направления',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M8 21h8M12 18v3"/></svg>',
  },
  {
    title: 'Товары', href: 'shop.html#catalog',
    text: 'Подписки на нейросети, API-доступы, Telegram Premium и Stars — условия покупки в Telegram-боте',
    link: 'Открыть витрину',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M9 12v4M15 12v4"/></svg>',
  },
  {
    title: 'Производство', href: 'service.html#design',
    text: 'Дизайн, 3D-моделирование, монтаж и презентации — креативный цех под ключ в едином стиле',
    link: 'Обсудить проект',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
  },
  {
    title: 'Автоматизация', href: 'service.html#integrations',
    text: 'Интеграции по API, автоматизация рутины и внутренние приложения — код, который убирает ручную работу',
    link: 'Выбрать решение',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/></svg>',
  },
];

const CREW = [
  ['Проджект-менеджер', 'Управление проектами и сроками', 'PM', 'team-pm.svg'],
  ['Креативный директор', 'Арт-дирекшн и стратегия', 'AD', 'team-ad.jpg'],
  ['UX/UI-дизайнер', 'Интерфейсы и прототипы', 'UI', 'team-ui.jpg'],
  ['Графический дизайнер', 'Айдентика и фирменный стиль', 'Ps', 'team-ps.jpg'],
  ['3D-моделлер', 'Модели, сцены и рендеры', '3D', 'team-3d.jpg'],
  ['Дизайнер презентаций', 'Деки и инфографика', 'Ke', 'team-ke.jpg'],
  ['Моушн-дизайнер', 'Монтаж и анимация', 'Ae', 'team-ae.jpg'],
  ['Веб-разработчик', 'Сайты, WordPress и Mini Apps', 'DEV', 'team-dev.jpg'],
  ['ИИ-инженер', 'Нейросети и автоматизация', 'AI', 'team-ai.jpg'],
  ['Трафик-менеджер', 'Реклама, посевы и аналитика', 'TG', 'team-traffic.jpg'],
  ['Финансовый менеджер', 'Учёт, договоры и документы', '₽', 'team-fin.svg'],
];
const SERVICE_IDS = ['sites', 'miniapp', 'bots', 'ai', 'design', 'model3d', 'video', 'tg', 'ads', 'integrations'];
const SERVICES = [
  ['Сайты', ['Лендинги и магазины', 'Заявки прямо в CRM']],
  ['Mini Apps', ['Магазины внутри Telegram', 'Оплата в пару тапов']],
  ['Боты', ['Продажи и поддержка 24/7', 'Интеграции с CRM и 1С']],
  ['Нейросети', ['Подписки и API-ключи', 'Внедрение ИИ в процессы']],
  ['Дизайн', ['UI/UX и бренд-системы', 'Презентации и моушн']],
  ['3D', ['Модели и WebGL-сцены', 'Рендеры и анимация']],
  ['Видео', ['Промо и Reels', 'Монтаж и цветокор']],
  ['Telegram', ['Premium · Stars', 'Каналы под ключ']],
  ['Реклама', ['Telegram Ads и посевы', 'До окупаемой связки']],
  ['Автоматизация', ['Интеграции и API', 'Поддержка и SLA']],
];
/* Детальный каталог типов внутри каждой услуги.
   p — базовая цена, from:true — цена «от», p:null — по запросу после брифа */
const SERVICE_TYPES = {
  sites: {
    lead: 'От одностраничного лендинга до магазина: авторский дизайн, адаптив, скорость и заявки, которые не теряются.',
    types: [
      { n: 'Лендинг под ключ', d: 'Одностраничный сайт с сильным оффером, блоком услуг и портфолио. Заявки падают в Telegram и на почту.', p: 45000, from: true, t: 'от 7 дней', f: ['Дизайн с нуля, без шаблонов', 'Адаптив и скорость 90+ в Lighthouse', 'Домен и SSL подключаем мы'] },
      { n: 'Сайт с заявками в CRM', d: 'Многостраничный сайт компании: услуги, кейсы, формы. Заявки сразу в CRM и Telegram с защитой от спама.', p: 65000, from: true, t: 'от 10 дней', f: ['Интеграция с CRM и Telegram', 'Антиспам и валидация', 'Метрика и цели на старте'] },
      { n: 'Сайт-калькулятор', d: 'Клиент собирает параметры заказа и сразу видит смету. Расчёт уходит вам в чат и клиенту на почту в PDF.', p: 85000, from: true, t: 'от 16 дней', f: ['Любые формулы и параметры', 'Смета в PDF на почту', 'Экспорт расчёта в CRM'] },
      { n: 'WordPress + наша админка', d: 'Сайт на WordPress с понятной админкой: сами меняете цены, товары и тексты, без разработчика.', p: 70000, from: true, t: 'от 14 дней', f: ['Удобная админка без кода', 'Интеграция с WooCommerce', 'Обучение и документация'] },
      { n: 'Интернет-магазин', d: 'Каталог с корзиной, оплатой, кабинетом и складом — цифровых или физических товаров.', p: 120000, from: true, t: 'от 21 дня', f: ['Способ оплаты по согласованию', 'Личный кабинет и заказы', 'Синхронизация остатков'] },
      { n: 'Web3 / Crypto-проект', d: 'Сайт с подключением кошельков, минтом, дашбордом токена и интеграцией TON/ETH. С аудитом логики.', p: null, t: 'после брифа', f: ['TON Connect и EVM-кошельки', 'Работа с контрактами', 'Аудит и тесты перед релизом'] },
    ],
  },
  miniapp: {
    lead: 'Mini Apps — полноценные приложения внутри Telegram: без установки, с оплатой в пару тапов.',
    types: [
      { n: 'Mini App магазин', d: 'Каталог с корзиной, оплатой и историей заказов прямо в интерфейсе Telegram.', p: 60000, from: true, t: 'от 14 дней', f: ['Нативная оплата Telegram', 'Синхрон с ботом и складом', 'Push о статусе заказа'] },
      { n: 'Mini App запись и брони', d: 'Слоты, мастера, напоминания и предоплата — для услуг с расписанием.', p: 45000, from: true, t: 'от 12 дней', f: ['Живое расписание', 'Выбор мастера и услуги', 'Отмена и перенос внутри'] },
      { n: 'Каталог-витрина', d: 'Эффектная презентация продуктов или портфолио с 3D и анимациями.', p: 35000, from: true, t: 'от 10 дней', f: ['Тёмный премиальный UI', 'Видео и 3D в карточках', 'Аналитика просмотров'] },
      { n: 'Игровая механика', d: 'Квесты, колесо фортуны, баллы и розыгрыши для удержания аудитории.', p: 60000, from: true, t: 'от 18 дней', f: ['Награды и баллы', 'Антифрод-логика', 'Интеграция с CRM'] },
    ],
  },
  bots: {
    lead: 'Боты, которые продают, поддерживают и снимают рутину — с базой данных, оплатой и админкой.',
    types: [
      { n: 'Бот-магазин с автовыдачей', d: 'Витрина, корзина, оплата и выдача цифровых товаров. Состав интеграций согласуем под ваш проект.', p: 45000, from: true, t: 'от 10 дней', f: ['Склад ключей и вебхуки', 'Выдача в чат, на почту и в ЛК', 'Mini App поверх каталога'] },
      { n: 'ИИ-бот поддержки', d: 'Саппорт на языковых моделях с базой знаний компании: отвечает мгновенно, эскалирует человеку.', p: 60000, from: true, t: 'от 12 дней', f: ['База знаний из ваших файлов', 'Передача диалога человеку', 'Аналитика частых вопросов'] },
      { n: 'Бот записи и бронирования', d: 'Слоты, напоминания, предоплата и календарь — для услуг с записью клиентов.', p: 35000, from: true, t: 'от 9 дней', f: ['Синхронизация календаря', 'Напоминания в Telegram', 'Способ предоплаты по согласованию'] },
      { n: 'Интеграции с CRM и 1С', d: 'Связываем бота с вашими системами: заказы, статусы, оплаты и склад без ручного переноса.', p: 30000, from: true, t: 'от 7 дней', f: ['Амора, Битрикс24, 1С', 'Логи и мониторинг ошибок', 'Документация для команды'] },
    ],
  },
  ai: {
    lead: 'Доступ к нейросетям без зарубежных карт и внедрение ИИ в реальные процессы компании.',
    types: [
      { n: 'Подписки на нейросети', d: 'ChatGPT, Claude, Gemini, Grok и Midjourney. Доступные варианты и условия активации — в витрине и Telegram-боте.', p: 2490, from: true, t: 'условия — в боте', f: ['Варианты и цены — в витрине', 'Оформление в Telegram-боте', 'Помощь менеджера'] },
      { n: 'API-ключи и токены', d: 'Доступы OpenAI и Anthropic для приложений и автоматизации. Наличие и условия уточняются у менеджера.', p: null, t: 'условия уточняются', f: ['Для приложений и ботов', 'Уточнение условий до оплаты', 'Помощь с подключением'] },
      { n: 'Внедрение ИИ в процессы', d: 'Аудит рутины и сборка связок: автоответы, генерация контента, обработка документов, ИИ-агенты.', p: 60000, from: true, t: 'от 14 дней', f: ['Аудит и карта автоматизации', 'Промпт-инжиниринг', 'Замер экономии времени'] },
      { n: 'Обучение команды', d: 'Воркшоп под ваши задачи: сотрудники работают с ИИ уверенно и по гайдлайнам студии.', p: 30000, from: true, t: '2–4 встречи', f: ['Разбор ваших кейсов', 'Шаблоны и промпт-бук', 'Поддержка 30 дней'] },
    ],
  },
  design: {
    lead: 'UI/UX, бренд-системы и презентации, которые одинаково дорого выглядят на экране и в печати.',
    types: [
      { n: 'UI/UX под ключ', d: 'Исследование, прототип, дизайн-система и готовые экраны для веба или приложения.', p: 60000, from: true, t: 'от 14 дней', f: ['CJM и кликабельный прототип', 'Компонентная библиотека', 'Светлая и тёмная темы'] },
      { n: 'Бренд-пак', d: 'Логотип, айдентика, носители и гайдлайн — характер бренда в одной системе.', p: 60000, from: true, t: 'от 12 дней', f: ['3 концепта знака', 'Цвета, шрифты, сетка', 'Гайдлайн в PDF'] },
      { n: 'Презентация и питч-дек', d: '12–15 слайдов под инвестиции или сделку: структура истории, инфографика, аккуратная типографика.', p: 25000, from: true, t: 'от 8 дней', f: ['Логика истории под задачу', 'Инфографика цифр', 'Анимация и PDF'] },
      { n: 'Моушн-дизайн', d: 'Анимированные логотипы, интерфейсные анимации и рекламные креативы под бренд.', p: 18000, from: true, t: 'от 7 дней', f: ['Lottie и видео-форматы', 'Звук и тайминг', 'Оптимизация под веб'] },
      { n: 'Графика и креативы', d: 'Серии постеров, обложки каналов, баннеры и рекламные комплекты в едином стиле.', p: 8000, from: true, t: 'от 3 дней', f: ['Серия в едином стиле', 'Исходники в Figma/PSD', 'Адаптация под форматы'] },
    ],
  },
  model3d: {
    lead: 'Объёмная графика для сайтов, карточек товаров и рекламы: модели, которые можно покрутить.',
    types: [
      { n: 'Модели товаров', d: '3D-модели продукции для карточек, AR-примерки и рендеров — с чистой сеткой под веб и движки.', p: 15000, from: true, t: 'от 5 дней', f: ['Retopo, UV и PBR-текстуры', 'Форматы GLB/FBX/USDZ', 'Оптимизация веса модели'] },
      { n: 'Интерактивная 3D-сцена', d: 'Сцена на сайт с вращением мышью и пальцем — как объект в этом блоке главной.', p: 45000, from: true, t: 'от 12 дней', f: ['Работает без тяжёлых движков', 'Drag-вращение и инерция', 'Оптимизация под мобильные'] },
      { n: '3D-логотип', d: 'Объёмная версия знака бренда для видео, заставок и соцсетей.', p: 15000, from: true, t: 'от 6 дней', f: ['Несколько ракурсов', 'Цикл анимации знака', 'Исходники Blender/C4D'] },
      { n: 'Рендеры и анимация', d: 'Стилизованные ролики и статичные кадры с кинематографичным светом.', p: 20000, from: true, t: 'от 8 дней', f: ['Сценарий и раскадровка', 'Цветокоррекция', '4K и вертикальные версии'] },
    ],
  },
  video: {
    lead: 'Монтаж и моушн: от 15-секундного Reels до презентационного фильма бренда.',
    types: [
      { n: 'Промо-ролик', d: 'Полный цикл: сценарий, монтаж, цветокоррекция, моушн-графика и звук.', p: 35000, from: true, t: 'от 10 дней', f: ['До 3 правок включено', 'Хронометраж до 90 секунд', 'Версии под все площадки'] },
      { n: 'Пак Reels / Shorts (5 шт)', d: 'Серия коротких видео с ритмичным монтажом, субтитрами и хуком в первые секунды.', p: 25000, from: true, t: 'от 7 дней', f: ['5 роликов в едином стиле', 'Субтитры и хук-кадры', 'Вертикаль 9:16'] },
      { n: 'Монтаж YouTube и подкастов', d: 'Длинный материал: сведение дорожек, чистка звука, нарезки и обложки для выпуска.', p: 12000, from: true, t: 'от 5 дней', f: ['До 30 минут готового видео', 'Субтитры и таймкоды', 'Обложка в комплекте'] },
      { n: 'Цвет и звук', d: 'Постпродакшн готового материала: цветокоррекция, чистка звука, саунд-дизайн.', p: 8000, from: true, t: 'от 4 дней', f: ['Единый цветовой стиль', 'Мастер под веб и эфир', 'Легальные библиотеки музыки'] },
    ],
  },
  tg: {
    lead: 'Всё для Telegram, кроме серых схем: подписки, звёзды и упаковка каналов.',
    types: [
      { n: 'Premium и Stars', d: 'Telegram Premium на квартал или год и звёзды Stars — условия оформления в боте.', p: 140, from: true, t: 'условия — в боте', f: ['Срок и стоимость — в витрине', 'Условия активации — по запросу', 'Связь с менеджером'] },
      { n: 'Оформление канала', d: 'Аватар, описание, закрепы, обложки постов и контент-план на месяц.', p: 12000, from: true, t: 'от 5 дней', f: ['Айдентика и закрепы', 'Контент-план на месяц', 'Стартовая аналитика'] },
      { n: 'Комьюнити и чаты', d: 'Создаём и настраиваем сообщество: правила, бот-модератор, роли и онбординг.', p: 20000, from: true, t: 'от 7 дней', f: ['Бот-модератор 24/7', 'Сценарии онбординга', 'Система тегов и уровней'] },
      { n: 'Ведение канала', d: 'Контент, оформление и рост по подпискам: 8–12 постов в месяц с отчётом.', p: 45000, from: true, t: 'за месяц', f: ['Контент-план и тексты', 'Визуал в фирменном стиле', 'Отчёт по охватам и подпискам'] },
    ],
  },
  ads: {
    lead: 'Платный трафик, который измеряется в окупаемости, а не в кликах.',
    types: [
      { n: 'Telegram Ads', d: 'Ведём официальный кабинет: сегменты, креативы, ставки и отчёт по стоимости заявки.', p: 25000, from: true, t: 'за месяц', f: ['Доступ в официальный кабинет', 'Связка с ботом или каналом', 'Еженедельная аналитика'] },
      { n: 'Посевы в каналах', d: 'Подбираем площадки под аудиторию, согласуем выходы и контролируем результат.', p: 15000, from: true, t: 'от 7 дней', f: ['База проверенных каналов', 'Договор и закрывающие', 'A/B-тест заголовков'] },
      { n: 'Таргет и контекст', d: 'Связки в соцсетях и поиске: ведём до целевой стоимости заявки.', p: 30000, from: true, t: 'за месяц', f: ['Креативы под сегменты', 'Сквозная аналитика', 'Масштабирование связок'] },
      { n: 'Сквозная аналитика', d: 'Учёт расходов и выручки по каждому каналу в одном дашборде.', p: 20000, from: true, t: 'от 8 дней', f: ['Колтрекинг и UTM', 'Дашборд окупаемости', 'Автоотчёты в Telegram'] },
    ],
  },
  integrations: {
    lead: 'Связываем сервисы между собой и убираем ручную работу: код, который работает без вас.',
    types: [
      { n: 'Интеграции по API', d: 'CRM, таблицы, мессенджеры, платёжные шлюзы и вебхуки — в одной работающей связке.', p: 25000, from: true, t: 'от 6 дней', f: ['Обработка ошибок и ретраи', 'Логи и мониторинг', 'Документация для команды'] },
      { n: 'Автоматизация рутины', d: 'Сценарии в n8n/Make: заявки, счета, уведомления и отчёты без участия человека.', p: 20000, from: true, t: 'от 4 дней', f: ['Карта процессов до старта', 'Замена ручных операций', 'Инструкция для сотрудников'] },
      { n: 'Внутренние приложения', d: 'Дашборды, системы учёта и кабинеты с ролями, отчётами и выгрузками.', p: 60000, from: true, t: 'от 20 дней', f: ['Роли и права доступа', 'Отчёты и выгрузки', 'Хостинг и поддержка'] },
      { n: 'Поддержка и SLA', d: 'Дежурство, бэкапы, обновления и правки с реакцией в течение часа.', p: 15000, from: true, t: 'за месяц', f: ['Реакция до 1 часа', 'Бэкапы и мониторинг 24/7', 'Пул часов на доработки'] },
    ],
  },
};
const GOODS = [
  { id:'a1', cat:'ai', name:'ChatGPT Plus — месяц', price:2490, img:'product-chatgpt.jpg',
    desc:'Подписка ChatGPT Plus на один месяц. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты; состав функций определяется OpenAI.' },
  { id:'a2', cat:'ai', name:'Claude Pro — месяц', price:2590, img:'product-claude.jpg',
    desc:'Подписка Claude Pro на один месяц. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты; состав функций определяется Anthropic.' },
  { id:'a3', cat:'ai', name:'Midjourney Standard — месяц', price:2990, img:'product-midjourney.jpg',
    desc:'Midjourney Standard на один месяц. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты; доступные функции определяются сервисом.' },
  { id:'a4', cat:'ai', name:'Perplexity Pro — 12 месяцев', price:3990, img:'product-perplexity.jpg',
    desc:'Подписка Perplexity Pro на 12 месяцев; стоимость указана за весь год. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты.' },
  { id:'a7', cat:'ai', name:'OpenAI API — доступ', price:null, img:'product-openai-key.jpg',
    desc:'Вариант доступа к OpenAI API. Наличие, формат, стоимость, баланс и условия использования уточняйте у менеджера.' },
  { id:'a8', cat:'ai', name:'Claude API — доступ', price:null, img:'product-claude-tokens.jpg',
    desc:'Вариант доступа к Claude API. Наличие, формат, стоимость, баланс и условия использования уточняйте у менеджера.' },
  { id:'a9', cat:'ai', name:'Gemini Advanced', price:null, img:'product-gemini.jpg',
    desc:'Вариант доступа к Gemini Advanced. Наличие, срок, стоимость, состав и условия активации уточняйте у менеджера.' },
  { id:'a10', cat:'ai', name:'Grok SuperGrok', price:null, img:'product-grok.jpg',
    desc:'Вариант доступа к Grok SuperGrok. Наличие, срок, стоимость, состав и условия активации уточняйте у менеджера.' },
  { id:'t1', cat:'tg', name:'Telegram Premium — 3 месяца', price:950, img:'product-tg-premium.jpg',
    desc:'Telegram Premium на 3 месяца. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты; возможности зависят от правил Telegram.' },
  { id:'t2', cat:'tg', name:'Telegram Premium — 12 месяцев', price:2400, img:'product-tg-premium.jpg',
    desc:'Telegram Premium на 12 месяцев. Способ активации, наличие и условия возврата уточняйте у менеджера до оплаты; возможности зависят от правил Telegram.' },
  { id:'t5', cat:'tg', name:'Telegram Stars — 100', price:140, img:'product-tg-stars.jpg',
    desc:'Пакет Telegram Stars — 100 звёзд. Возможность, способ зачисления и условия возврата уточняйте у менеджера до оплаты.' },
  { id:'t3', cat:'tg', name:'Telegram Stars — 500', price:700, img:'product-tg-stars.jpg',
    desc:'Пакет Telegram Stars — 500 звёзд. Возможность, способ зачисления и условия возврата уточняйте у менеджера до оплаты.' },
  { id:'t4', cat:'tg', name:'Telegram Stars — 1 000', price:1400, img:'product-tg-stars.jpg',
    desc:'Пакет Telegram Stars — 1 000 звёзд. Возможность, способ зачисления и условия возврата уточняйте у менеджера до оплаты.' },
];

const GOOD_FEATS = {
  ai: ['Условия покупки — в боте или у менеджера', 'Условия активации уточняются до оплаты', 'Состав функций определяется сервисом'],
  tg: ['Варианты оформления — в боте или у менеджера', 'Условия зачисления — в боте или у менеджера', 'Связь с менеджером через Telegram'],
};
const CAT = { ai:'нейросети', tg:'telegram' };
const CAT_IMG = {
  ai: 'product-ai.jpg', tg: 'product-tg.jpg',
};

/* ============================================================
   РЕНДЕР СПИСКОВ
   ============================================================ */
const pageOf = href => href.split('#')[0] || 'index.html';
$('#menuList').innerHTML = MENU.map(([label, href], i) => `
  <a class="menu-row" href="${href}">
  <span class="menu-word">${label}</span>${pageOf(href) === here ? '<i class="active-dot"></i>' : ''}</a>`).join('');




if ($('#marquee')) {
  $('#marquee').innerHTML = DIRECTIONS.map(d => `
    <a class="cv-card" href="${d.href}" data-cursor>
      <span class="cv-top">
        <span class="cv-ico">${d.icon}</span>
        <span class="cv-go" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
      </span>
      <span class="cv-body"><b>${d.title}</b><span>${d.text}</span></span>
      <span class="cv-tag">${d.link}<b>→</b></span>
    </a>`).join('');
  /* дублируем ленту для бесшовного цикла */
  $('#marquee').innerHTML += $('#marquee').innerHTML;
}

if ($('#servicesList')) $('#servicesList').innerHTML = SERVICES.map(([title, tags], i) => `
  <a class="sv-row st" href="service.html#${SERVICE_IDS[i]}" data-cursor>
    <span class="sv-title">${title}</span>
    <span class="sv-tags">${tags.map(t => `<span class="pill">${t}</span>`).join('')}</span>
    <span class="sv-go" aria-hidden="true">→</span>
  </a>`).join('');

const SHOP_FILTERS = ['all', 'ai', 'tg'];
function shopFilterFromURL() {
  const category = new URLSearchParams(location.search).get('category');
  return SHOP_FILTERS.includes(category) ? category : 'all';
}
let shopFilter = shopFilterFromURL();
function renderShop() {
  const list = GOODS.filter(g => shopFilter === 'all' || g.cat === shopFilter);
  $('#shopList').innerHTML = list.map((g, i) => {
    const discount = g.old ? Math.round((1 - g.price / g.old) * 100) : 0;
    return `
    <article class="good-card" style="--i:${i}" data-id="${g.id}" data-cursor>
      <a class="good-media" href="product.html#${g.id}" aria-label="Подробнее: ${g.name}">
        <img class="good-img" src="${g.img || CAT_IMG[g.cat]}" alt="${g.name}" loading="lazy">
        ${discount ? `<span class="good-sale">−${discount}%</span>` : ''}
        <span class="good-stock">${Number.isFinite(g.price) ? 'Условия в боте' : 'Уточнить у менеджера'}</span>
        <span class="good-zoom">Подробнее →</span>
      </a>
      <div class="good-body">
        <span class="good-cat">${CAT[g.cat]}</span>
        <h3 class="good-name"><a href="product.html#${g.id}">${g.name}</a></h3>
        <div class="good-foot">
          <span class="good-price${Number.isFinite(g.price) ? '' : ' is-inquiry'}">${goodPrice(g)}${g.old ? `<s>${money(g.old)}</s>` : ''}</span>
          ${Number.isFinite(g.price)
            ? `<button class="good-add" data-add="${g.id}">В корзину</button>`
            : `<a class="good-add" href="https://t.me/webnicssmng" target="_blank" rel="noopener noreferrer">Уточнить</a>`}
        </div>
      </div>
    </article>`;
  }).join('');
  $$('#shopFilters [data-filter]').forEach(button => {
    const active = button.dataset.filter === shopFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
if ($('#shopList')) renderShop();
$('#shopFilters')?.addEventListener('click', e => {
  const button = e.target.closest('[data-filter]');
  if (!button || !SHOP_FILTERS.includes(button.dataset.filter)) return;
  shopFilter = button.dataset.filter;
  renderShop();
  // Адрес отражает выбранный раздел, поэтому ссылкой можно поделиться.
  const url = new URL(location.href);
  if (shopFilter === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', shopFilter);
  try { history.replaceState(history.state, '', url.href); } catch (_) { /* file:// или ограничение браузера */ }
  if (hasGsap) ScrollTrigger.refresh();
});
addEventListener('popstate', () => {
  if (!$('#shopList')) return;
  const next = shopFilterFromURL();
  if (next === shopFilter) return;
  shopFilter = next;
  renderShop();
  if (hasGsap) ScrollTrigger.refresh();
});

if ($('#teamCards')) $('#teamCards').innerHTML = CREW.map(([tag, role, icon, img]) => `
  <article class="tm-card st" data-cursor>
    <div class="tm-media">
      <img src="${img}" alt="${tag} — ${role}" loading="lazy">
      <span class="tm-chip">${icon}</span>
      <span class="tm-shine" aria-hidden="true"></span>
    </div>
    <div class="tm-body">
      <h3 class="tm-role">${tag}</h3>
      <p class="tm-name">${role}</p>
    </div>
  </article>`).join('');

/* ============================================================
   СТРАНИЦА УСЛУГИ: КАТАЛОГ ТИПОВ (service.html)
   ============================================================ */
function svIdFromURL() {
  // Параметры адреса принимаются только из известного списка, а не из прототипа объекта.
  const h = location.hash.slice(1);
  if (SERVICE_IDS.includes(h)) return h;
  const q = new URLSearchParams(location.search).get('id');
  return SERVICE_IDS.includes(q) ? q : 'sites';
}
if ($('#svRoot')) {
  const svPills = $('#svPills');
  svPills.innerHTML = SERVICES.map(([title], i) =>
    `<button class="pill ${SERVICE_IDS[i] === svIdFromURL() ? 'active' : ''}" data-sv="${SERVICE_IDS[i]}">${title}</button>`).join('');
  function renderService(id, push) {
    const idx = SERVICE_IDS.indexOf(id);
    if (idx < 0) return;
    const [title, tags] = SERVICES[idx];
    const block = SERVICE_TYPES[id];
    $$('#svPills .pill').forEach((p, i) => p.classList.toggle('active', SERVICE_IDS[i] === id));
    $('#svRoot').innerHTML = `
      <div class="sv-hero st" id="${id}">
        <h1 class="page-display">${title.toUpperCase()}</h1>
        <p class="page-lead">${block.lead}</p>
        <div class="sv-hero-tags">${tags.map(t => `<span class="pill">${t}</span>`).join('')}</div>
      </div>
      <div class="sv-type-grid">
        ${block.types.map((t, i) => `
          <article class="sv-type st" style="--i:${i}">
            <div class="sv-type-head">
              <h3>${t.n}</h3>
            </div>
            <p class="sv-type-desc">${t.d}</p>
            <ul class="sv-type-feats">${t.f.map(x => `<li>${x}</li>`).join('')}</ul>
            <div class="sv-type-foot">
              <div><b>${t.p === null ? 'по запросу' : (t.from ? 'от ' + money(t.p) : money(t.p))}</b><span>${t.t}</span></div>
              <a class="btn-chip" href="index.html#contact" data-cursor><span class="btn-label">Обсудить</span><span class="btn-arrow">→</span></a>
            </div>
          </article>`).join('')}
      </div>
      <div class="sv-cta st">
        <h2>Не нашли нужный формат?</h2>
        <p>Соберём смешанный продукт под задачу: сайт с ботом, Mini App с автовыдачей, нейросети внутри вашего процесса.</p>
        <a class="btn-chip big" href="https://t.me/webnicssmng" target="_blank" rel="noopener noreferrer" data-cursor>
          <span class="btn-label">Написать в Telegram</span><span class="btn-arrow">✦</span></a>
      </div>`;
    document.title = `${title} — WEBNICSS®`;
    // Динамически созданные карточки не должны оставаться скрытыми без GSAP.
    if (!hasGsap) $$('#svRoot .st, #svRoot [data-reveal]').forEach(el => el.classList.add('in'));
    if (push && location.hash.slice(1) !== id) history.pushState(null, '', `#${id}`);
    if (hasGsap) ScrollTrigger.refresh();
    if (push) requestAnimationFrame(() => scrollToTarget(document.getElementById(id)));
  }
  renderService(svIdFromURL(), false);
  svPills.addEventListener('click', e => {
    const b = e.target.closest('[data-sv]');
    if (b) renderService(b.dataset.sv, true);
  });
  addEventListener('hashchange', () => { if ($('#svRoot')) renderService(svIdFromURL(), false); });
}

/* ============================================================
   СТРАНИЦА ТОВАРА: ОПИСАНИЕ (product.html)
   ============================================================ */
function goodIdFromURL() {
  const requested = location.hash.slice(1) || new URLSearchParams(location.search).get('id');
  return requested ? (GOODS.some(g => g.id === requested) ? requested : null) : GOODS[0].id;
}
if ($('#prodRoot')) {
  function renderProduct(id, push) {
    const g = GOODS.find(x => x.id === id);
    if (!g) {
      $('#prodRoot').innerHTML = `<div class="sv-cta"><h2>Товар недоступен</h2><p>Этой позиции больше нет в витрине. Посмотрите актуальный каталог или уточните наличие у менеджера.</p><a class="btn-chip big" href="shop.html#catalog"><span class="btn-label">Открыть витрину</span><span class="btn-arrow">→</span></a></div>`;
      document.title = 'Товар недоступен — WEBNICSS®';
      if (hasGsap) ScrollTrigger.refresh();
      return;
    }
    const discount = g.old ? Math.round((1 - g.price / g.old) * 100) : 0;
    const related = GOODS.filter(x => x.cat === g.cat && x.id !== g.id).slice(0, 3);
    $('#prodRoot').innerHTML = `
      <div class="prod-grid" id="${g.id}">
        <div class="prod-media st">
          <img src="${g.img || CAT_IMG[g.cat]}" alt="${g.name}">
          ${discount ? `<span class="good-sale">−${discount}%</span>` : ''}
          <span class="good-stock">${Number.isFinite(g.price) ? 'Условия в боте' : 'Уточнить у менеджера'}</span>
        </div>
        <div class="prod-info st">
          <span class="good-cat">${CAT[g.cat]}</span>
          <h1 class="prod-name">${g.name}</h1>
          <div class="prod-price">${goodPrice(g)}${g.old ? `<s>${money(g.old)}</s>` : ''}</div>
          <p class="prod-desc">${g.desc}</p>
          <ul class="prod-feats">${GOOD_FEATS[g.cat].map(x => `<li>${x}</li>`).join('')}</ul>
          <div class="prod-actions">
            ${Number.isFinite(g.price)
              ? `<button class="btn-chip big" data-add="${g.id}" data-cursor><span class="btn-label">В корзину — ${money(g.price)}</span><span class="btn-arrow">+</span></button>`
              : `<a class="btn-chip big" href="https://t.me/webnicssmng" target="_blank" rel="noopener noreferrer"><span class="btn-label">Уточнить у менеджера</span><span class="btn-arrow">↗</span></a>`}
            <a class="btn-chip ghost" href="shop.html#catalog" data-cursor><span class="btn-label">← В витрину</span></a>
          </div>
          <div class="prod-pay">
            <small>Способы оплаты и условия выдачи уточняйте в <a href="https://t.me/webnicss_bot" target="_blank" rel="noopener noreferrer">Telegram-боте</a> или у менеджера</small>
          </div>
        </div>
      </div>
      <section class="prod-related">
        <h2 class="section-display" data-reveal="lit">ПОХОЖИЕ <em>ТОВАРЫ</em></h2>
        <div class="good-mini-grid">
          ${related.map(x => `
            <button class="good-mini prod-rel" data-prod="${x.id}">
              <img src="${x.img || CAT_IMG[x.cat]}" alt="${x.name}" loading="lazy">
              <span class="good-mini-cap"><b>${x.name}</b><span>${goodPrice(x)}</span></span>
            </button>`).join('')}
        </div>
      </section>`;
    document.title = `${g.name} — WEBNICSS®`;
    if (!hasGsap) $$('#prodRoot .st, #prodRoot [data-reveal]').forEach(el => el.classList.add('in'));
    if (push && location.hash.slice(1) !== id) history.pushState(null, '', `#${id}`);
    if (hasGsap) ScrollTrigger.refresh();
    if (push) requestAnimationFrame(() => scrollToTarget(document.getElementById(id)));
  }
  renderProduct(goodIdFromURL(), false);
  $('#prodRoot').addEventListener('click', e => {
    const b = e.target.closest('[data-prod]');
    if (b) renderProduct(b.dataset.prod, true);
  });
  addEventListener('hashchange', () => { if ($('#prodRoot')) renderProduct(goodIdFromURL(), false); });
}

/* подпись лоадера под текущую страницу */
(function loaderLabel() {
  const label = document.body.dataset.loaderLabel || 'Главная';
  const bar = $('[data-loader-bar]'); if (bar) bar.textContent = label;
})();

/* Цель адреса ищем по ID, не передавая произвольный hash в CSS-селектор. */
function hashTarget(hash) {
  if (!hash || hash.length <= 1) return null;
  try {
    const id = decodeURIComponent(hash.slice(1));
    return id === 'home' ? document.body : document.getElementById(id);
  } catch (_) { return null; }
}
function deepLink() {
  const target = hashTarget(location.hash);
  if (!target) return;
  // Дожидаемся окончания загрузчика, построения карточек и расчёта ScrollTrigger.
  setTimeout(() => {
    if (target === hashTarget(location.hash)) scrollToTarget(target);
  }, 350);
}

/* ============================================================
   SMOOTH SCROLL (Lenis) + ЯКОРЯ
   ============================================================ */
let lenis = null;
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({ duration: 1.8, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
const scrollToTarget = el => {
  if (!el) return;
  const home = el === document.body || el.id === 'home';
  // Берём координату раскладки, а не сдвиг анимированной карточки. Так адрес
  // остаётся точным и после завершения её появления, и при переходе Back.
  let layoutTop = 0;
  for (let node = el; node instanceof HTMLElement; node = node.offsetParent) layoutTop += node.offsetTop;
  const top = home ? 0 : Math.max(0, Math.round(layoutTop - 90));
  if (lenis) lenis.scrollTo(top, { duration: 1.3, immediate: reduce, force: true });
  else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
};
const canonicalPath = path => path.endsWith('/') ? `${path}index.html` : path;
document.addEventListener('click', e => {
  // Не мешаем открывать ссылку в новой вкладке или использовать системные действия браузера.
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.hasAttribute('download') || (a.target && a.target.toLowerCase() !== '_self')) return;
  let url;
  try { url = new URL(a.href, location.href); } catch (_) { return; }
  if (url.origin !== location.origin || url.search !== location.search ||
      canonicalPath(url.pathname) !== canonicalPath(location.pathname) || !url.hash) return;
  const target = hashTarget(url.hash);
  if (!target) return;
  e.preventDefault();
  if (url.href !== location.href) {
    try { history.pushState(history.state, '', url.href); } catch (_) { /* file:// или ограничение браузера */ }
  }
  scrollToTarget(target);
});
// Вперёд/назад и ручное изменение фрагмента должны открывать тот же раздел.
addEventListener('hashchange', () => {
  // Дать браузеру и Lenis синхронизироваться после нативного перехода по истории.
  requestAnimationFrame(() => {
    const target = hashTarget(location.hash);
    if (target && !document.body.classList.contains('is-loading')) scrollToTarget(target);
  });
});

/* ============================================================
   ЧАСЫ (время студии, UTC+3)
   ============================================================ */
(function clock() {
  const fmt = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Volgograd', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const tick = () => $$('[data-clock]').forEach(el => { el.textContent = `${fmt.format(new Date())} · UTC+3`; });
  tick(); setInterval(tick, 1000);
})();

/* ============================================================
   СКРЭМБЛ
   ============================================================ */
function scramble(el) {
  const final = el.dataset.final || el.textContent;
  el.dataset.final = final;
  const glyphs = '!<>-_\\/[]{}=+*^?#%@абвгдежзийклмнопрстуфхцчшщъыьэюя0123456789';
  let tick = 0; const total = 18;
  const id = setInterval(() => {
    tick++;
    el.textContent = [...final].map((c, i) =>
      c === ' ' || tick >= (total * i) / final.length + 4 ? c : glyphs[(Math.random() * glyphs.length) | 0]).join('');
    if (tick > total + 4) { clearInterval(id); el.textContent = final; }
  }, 40);
}
/* глитч-появление и периодические сбои названия */
const glitchEl = $('.glitch');
const heroLogo = $('.hero-logo');
function glitchBurst(ms) {
  if (!glitchEl || reduce) return;
  glitchEl.classList.add('glitching');
  setTimeout(() => glitchEl.classList.remove('glitching'), ms);
}
function bootGlitch() {
  if (!glitchEl) return;
  heroLogo.classList.add('glitch-in');
  if (reduce) return;
  glitchBurst(1300);
  setTimeout(() => scramble(glitchEl), 500);
  setInterval(() => { glitchBurst(380); setTimeout(() => scramble(glitchEl), 120); }, 5200);
}
if (!hasGsap) setTimeout(bootGlitch, 900);

/* ============================================================
   КУРСОР
   ============================================================ */
(function cursor() {
  if (matchMedia('(pointer: coarse)').matches) return;
  const c = $('.cursor');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, on = false;
  addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!on) { on = true; x = tx; y = ty; c.classList.add('on'); }
  });
  document.addEventListener('mouseleave', () => { on = false; c.classList.remove('on'); });
  document.addEventListener('mouseover', e => c.classList.toggle('grow', !!e.target.closest('[data-cursor], a, button')));
  const loop = () => {
    x += (tx - x) * .2; y += (ty - y) * .2;
    c.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  };
  loop();
})();

/* ============================================================
   МЕНЮ
   ============================================================ */
const menu = $('#menu'), menuBtn = $('#menuBtn'), menuLabel = $('.menu-label', menuBtn);
let menuOpen = false;
function setMenu(v) {
  menuOpen = v;
  menu.classList.toggle('open', v);
  menuBtn.classList.toggle('menu-open', v);
  menuBtn.setAttribute('aria-expanded', v);
  menu.setAttribute('aria-hidden', !v);
  menuLabel.textContent = v ? 'ЗАКРЫТЬ' : 'МЕНЮ';
  if (hasGsap) {
    if (v) {
      lenis.stop();
      gsap.fromTo('.menu-row', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .06, delay: .25 });
      gsap.fromTo('.menu-extra,.menu-social', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .05, delay: .45 });
      gsap.fromTo('.menu-head', { opacity: 0 }, { opacity: 1, duration: .6, delay: .3 });
    } else if (!document.body.classList.contains('is-loading')) lenis.start();
  }
}
menuBtn.addEventListener('click', () => setMenu(!menuOpen));
$$('[data-menu-close]').forEach(el => el.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeCart(); } });
menu.addEventListener('click', e => { if (e.target.closest('.menu-row')) setMenu(false); });
$('#menuCart').addEventListener('click', () => { setMenu(false); setTimeout(() => openCart(), 350); });

/* ============================================================
   HERO CANVAS — звёздное поле
   ============================================================ */
(function starfield() {
  const cv = $('#heroCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, stars = [], comets = [];
  const mouse = { x: 0, y: 0 };
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    W = cv.offsetWidth; H = cv.offsetHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: .3 + Math.random() * 1.7, tw: Math.random() * 6.28, hot: Math.random() > .9,
    }));
  }
  size(); addEventListener('resize', size);
  cv.parentElement.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width - .5;
    mouse.y = (e.clientY - r.top) / r.height - .5;
  });
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const time = t * .001;
    for (const s of stars) {
      s.y += s.z * .22;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      const px = s.x + mouse.x * s.z * 26, py = s.y + mouse.y * s.z * 26;
      ctx.beginPath();
      ctx.arc(px, py, s.z * .85, 0, Math.PI * 2);
      ctx.fillStyle = s.hot ? `rgba(47,230,255,${.6 + Math.sin(time * 2 + s.tw) * .35})`
        : `rgba(255,255,255,${.2 + Math.abs(Math.sin(time + s.tw)) * .45})`;
      ctx.fill();
    }
    if (Math.random() < .008) comets.push({ x: Math.random() * W * .7, y: Math.random() * H * .35, vx: 5 + Math.random() * 4, life: 1 });
    comets = comets.filter(c => c.life > 0 && c.x < W);
    for (const c of comets) {
      c.x += c.vx; c.y += 2.2; c.life -= .012;
      const g = ctx.createLinearGradient(c.x - 90, c.y - 42, c.x, c.y);
      g.addColorStop(0, 'rgba(47,230,255,0)');
      g.addColorStop(1, `rgba(47,230,255,${Math.max(c.life, 0)})`);
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c.x - 90, c.y - 42); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    if (!reduce) requestAnimationFrame(frame);
  })(0);
})();

/* ============================================================
   3D-КОРОБКА АВТОВЫДАЧИ
   ============================================================ */
function cuboid(cls, w, d, h, extras = {}) {
  const el = document.createElement('div');
  el.className = `cuboid ${cls}`;
  const faces = {
    top: [w, d, `translateZ(${h / 2}px)`], bottom: [w, d, `translateZ(${-h / 2}px) rotateY(180deg)`],
    front: [w, h, `translateY(${d / 2}px) rotateX(90deg)`], back: [w, h, `translateY(${-d / 2}px) rotateX(-90deg)`],
    right: [h, d, `translateX(${w / 2}px) rotateY(90deg)`], left: [h, d, `translateX(${-w / 2}px) rotateY(-90deg)`],
  };
  Object.entries(faces).forEach(([k, [fw, fh, tf]]) => {
    const f = document.createElement('div');
    f.className = `face f-${k}`;
    f.style.cssText = `width:${fw}px;height:${fh}px;margin:${-fh / 2}px 0 0 ${-fw / 2}px;transform:${tf}`;
    if (extras[k]) f.innerHTML = extras[k];
    el.append(f);
  });
  return el;
}
(function box() {
  const scene = $('[data-box]');
  if (!scene) return;
  const build = () => {
    scene.innerHTML = '';
    const W = Math.min(640, innerWidth * (innerWidth < 810 ? .78 : .5));
    const D = W * .7, H = W * .13;
    const screws = [[4, 18], [4, 82], [96, 18], [96, 82]].map(([x, y]) => `<i class="screw" style="left:${x}%;top:${y}%"></i>`).join('');
    const kase = cuboid('case', W, D, H, {
      front: `<div class="scribble"></div><div class="barcode"></div>${screws}`,
      right: '<div class="port"></div>', left: screws,
      top: '<div style="position:absolute;inset:6%;border:1px solid rgba(255,255,255,.08)"></div>',
    });
    const lid = cuboid('lid', W * .42, D * .44, H * .85);
    const gift = document.createElement('div');
    gift.className = 'box-gift';
    gift.innerHTML = '<span class="gift-key">WN-KEY</span>';
    scene.append(kase, lid, gift);
    return { W, D, H, lid, gift };
  };
  let b = build();
  if (!hasGsap) {
    const lid = $('.lid', scene);
    lid.style.transform = `translate3d(${-b.W * .2}px,${-b.D * .8}px,${b.H * 4.4}px) rotateX(-32deg) rotateZ(12deg)`;
    lid.style.opacity = '.95';
    const g = $('.box-gift', scene);
    if (g) g.style.opacity = '1';
    return;
  }
  let tl;
  const wire = () => {
    tl?.scrollTrigger?.kill(); tl?.kill();
    const lidH = b.H * .85;
    const s = {
      rx: 60, rz: -30, sc: 1, y: 0,                       // корпус
      lx: 0, ly: 0, lz: b.H / 2 + lidH / 2, lrx: 0, lrz: 0, lo: 1, // крышка
      lift: 40, gop: 0,                                    // ключ из коробки
    };
    const apply = () => {
      const caseEl = $('.case', scene), lid = $('.lid', scene), giftEl = $('.box-gift', scene);
      caseEl.style.transform = `translateY(${s.y}px) scale(${s.sc}) rotateX(${s.rx}deg) rotateZ(${s.rz}deg)`;
      lid.style.transform = `translate3d(${s.lx}px,${s.ly}px,${s.lz}px) rotateX(${s.lrx}deg) rotateZ(${s.lrz}deg)`;
      lid.style.opacity = s.lo;
      if (giftEl) {
        giftEl.style.opacity = s.gop;
        giftEl.style.transform = `translate(-50%, calc(-50% + ${s.lift}px)) scale(${.6 + s.gop * .5})`;
      }
    };
    apply();
    tl = gsap.timeline({
      scrollTrigger: { trigger: '.boxsec', start: 'top 75%', end: 'bottom 30%', scrub: 1 },
      onUpdate: apply,
    })
      // 1) крышка вертикально взлетает над коробкой
      .to(s, { lz: b.H * 4.2, lrx: -8, lrz: 4, duration: .8, ease: 'power2.out' })
      // 2) отъезжает назад и в сторону, слегка наклонившись; ключ всплывает изнутри
      .to(s, { ly: -b.D * .8, lx: -b.W * .2, lrx: -32, lrz: 12, lz: b.H * 4.4, lo: .95, duration: 1.1, ease: 'none' }, '-=.25')
      .to(s, { lift: -150, gop: 1, rz: -12, duration: 1.1, ease: 'none' }, '<')
      // 3) лёгкая доводка корпуса
      .to(s, { rx: 63, rz: -5, y: -14, sc: .97, duration: .7, ease: 'none' }, '-=.5');
  };
  wire();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { b = build(); wire(); }, 200); });
})();

/* ============================================================
   АНИМАЦИИ GSAP / ФОЛБЭК
   ============================================================ */
function splitWords(el) {
  const nodes = [];
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) nodes.push(tw.currentNode);
  const words = [];
  nodes.forEach(n => {
    const frag = document.createTextNode ? document.createDocumentFragment() : null;
    const f = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { f.append(part); return; }
      const s = document.createElement('span');
      s.className = 'wd'; s.textContent = part;
      f.append(s); words.push(s);
    });
    n.replaceWith(f);
  });
  return words;
}

if (hasGsap) {
  /* nav: появление лого/инфо после 140px и компактные зоны */
  const navEl = $('.nav');
  const compact = new Set();
  let past = false;
  const updateNav = () => {
    navEl.classList.toggle('show-logo', past);
    navEl.classList.toggle('show-info', past && compact.size === 0);
  };
  lenis.on('scroll', e => { const p = e.scroll > 140; if (p !== past) { past = p; updateNav(); } });
  $$('[data-nav-compact]').forEach((z, i) => ScrollTrigger.create({
    trigger: z, start: 'top 70px', end: 'bottom 70px',
    onToggle: s => { s.isActive ? compact.add(i) : compact.delete(i); updateNav(); },
  }));

  /* velocity-марки + палец/мышь */
  if ($('#marquee')) (function marquee() {
    const wrap = $('[data-marquee-wrap]');
    const track = $('#marquee');
    wrap.style.touchAction = 'none';
    let x = 0, setW = 1, vel = 0, dragging = false, startX = 0, startTrackX = 0;
    const measure = () => { setW = (track.scrollWidth + 12) / 2; };
    measure(); document.fonts.ready.then(measure); addEventListener('resize', measure);
    const wrapX = () => {
      if (x <= -setW) x += setW;
      if (x >= setW) x -= setW;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };
    track.addEventListener('pointerdown', e => {
      dragging = true;
      startX = e.clientX;
      startTrackX = x;
      vel = 0;
      track.style.transition = 'none';
    });
    addEventListener('pointermove', e => {
      if (!dragging) return;
      x = startTrackX + (e.clientX - startX);
      wrapX();
    });
    addEventListener('pointerup', () => { if (dragging) { dragging = false; track.style.transition = ''; } });
    addEventListener('pointercancel', () => { dragging = false; track.style.transition = ''; });
    lenis.on('scroll', e => { if (!dragging) vel = e.velocity || 0; });
    gsap.ticker.add((t, dt) => {
      if (dragging) return;
      const speed = reduce ? 0 : 40 + Math.min(900, Math.abs(vel) * 16);
      x -= (speed * dt) / 1000; vel *= .9;
      wrapX();
    });
  })();

  /* пословный цветовой reveal */
  $$('[data-reveal]').forEach(el => {
    const soft = el.dataset.reveal === 'soft';
    const words = splitWords(el);
    gsap.fromTo(words, { color: soft ? '#2a2a2a' : '#464646' }, {
      color: soft ? '#878787' : '#d4d4d4', ease: 'none', stagger: .1,
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 40%', scrub: true },
    });
  });

  /* параллакс манифеста */
  gsap.fromTo('[data-mf-left]', { y: 0 }, { y: -60, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'top top', scrub: true } });
  gsap.fromTo('[data-mf-right]', { y: 90 }, { y: 0, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'top top', scrub: true } });

  /* about-card */
  gsap.fromTo('.about-card', { scale: .96, y: 80 }, { scale: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.about-card', start: 'top bottom', end: 'top 55%', scrub: true } });

  /* строки и работы */
  $$('.sv-row.st').forEach(row => gsap.from(row, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: row, start: 'top 92%' } }));
  if ($('.wk-grid')) gsap.from('.wk-cell.st', { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: '.wk-grid', start: 'top 85%' } });
  if ($$('.pj-card.st,.pj-mini.st,.good-mini.st').length) gsap.from('.pj-card.st,.pj-mini.st,.good-mini.st', { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .07,
    scrollTrigger: { trigger: '.pj-grid,.teaser', start: 'top 88%' } });

  /* team grid — каскадное появление карточек сетки */
  (function teamGrid() {
    const cards = $$('.tm-card');
    if (!cards.length) return;
    gsap.from(cards, {
      y: 48, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06,
      scrollTrigger: { trigger: '.tm-cards', start: 'top 86%', once: true },
      onComplete: () => gsap.set(cards, { clearProps: 'transform' }),
    });
  })();

  /* футер */
  $$('.ft-line').forEach(line => gsap.fromTo(line, { y: 100, rotation: 3, opacity: 0 },
    { y: 0, rotation: 0, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: line, start: 'top bottom', end: 'top 72%', scrub: true } }));
  gsap.fromTo('.ft-cta', { y: 60, opacity: 0 }, { y: 0, opacity: 1, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top 90%', end: 'top 30%', scrub: true } });

  /* загрузчик → интро */
  gsap.set('[data-intro]', { y: -160, opacity: 0 });
  if (loaderSeen) {
    /* повторный визит: прелоадер уже скрыт, интро без ожидания */
    gsap.set('.loader', { display: 'none' });
    bootGlitch();
    gsap.to('[data-intro]', { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .04,
      onComplete: () => { document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); deepLink(); } });
  }
  const loader = () => new Promise(done => {
    if (loaderSeen) return done();
    const cv = $('.ld-sphere');
    const ctx = cv.getContext('2d');
    const line = $('[data-loader-line]');
    const cx = cv.width / 2, cy = cv.height / 2, R = cx * 0.8;
    const TOTAL = 120;
    const flies = [];
    for (let i = 0; i < TOTAL; i++) {
      const phi = Math.acos(-1 + (2 * i) / TOTAL);
      const theta = Math.sqrt(TOTAL * Math.PI) * phi;
      flies.push({
        x: cx + R * Math.sin(phi) * Math.cos(theta),
        y: cy + R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi)
      });
    }
    const draw = (p) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, R);
      grad.addColorStop(0, 'rgba(47,230,255,.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(47,230,255,.22)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      const lit = Math.floor(p * TOTAL);
      for (let i = 0; i < TOTAL; i++) {
        const f = flies[i], isLit = i < lit;
        const d = 1 - Math.abs(f.z) / R;
        const size = isLit ? 1.6 + d * 2.6 : 0.7 + d * 1.2;
        const alpha = isLit ? 0.65 + d * 0.25 : 0.06 + d * 0.06;
        ctx.fillStyle = isLit ? (i % 2 === 0 ? '#2fe6ff' : '#8b5cf6') : 'rgba(255,255,255,.05)';
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(f.x, f.y, size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    };
    gsap.set('.ld-tag,.ld-name-char,.ld-light,.ld-meta,.ld-sphere-wrap', { opacity: 0 });
    gsap.set('.ld-content', { opacity: 0 });
    gsap.set(line, { scaleX: 0 });
    const prog = { v: 0 };
    gsap.timeline({ onComplete: done })
      .to('.ld-content', { opacity: 1, duration: 0.5, ease: 'power2.out' })
      .to(prog, {
        v: 1, duration: reduce ? 0.5 : 1.9, ease: 'power2.inOut',
        onUpdate: () => draw(prog.v)
      })
      .to('.ld-sphere-wrap,.ld-tag', { opacity: 1, duration: 0.5 }, '<0.25')
      .to('.ld-light', { xPercent: 240, duration: 1.2, ease: 'power2.inOut', opacity: 1 }, '<0.15')
      .to('.ld-name-char', { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.045 }, '<0.25')
      .to('.ld-meta', { opacity: 1, duration: 0.5 }, '<0.35')
      .to({}, { duration: 0.5 })
      .to('.ld-content', { y: -46, opacity: 0, duration: 0.45, ease: 'power3.in' }, '+=0.18')
      .to('.ld-front', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.12')
      .to('.ld-back', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.78')
      .set('.loader', { display: 'none' })
      .add(() => storageSet('sessionStorage', 'wn_loader', '1'));
  });
  loader().then(() => {
    if (loaderSeen) return; /* интро уже запущено выше */
    bootGlitch();
    gsap.to('[data-intro]', { y: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: .05,
      delay: reduce ? 0 : .35,
      onComplete: () => { document.body.classList.remove('is-loading'); lenis.start(); ScrollTrigger.refresh(); deepLink(); } });
  });
  $('.to-top')?.addEventListener('click', () => lenis.scrollTo(0, { duration: 2.6 }));
} else {
  /* ---------- ФОЛБЭК БЕЗ GSAP ---------- */
  document.documentElement.classList.add('no-gsap');
  const loaderEl = $('.loader');
  if (loaderSeen) { loaderEl.style.display = 'none'; document.body.classList.remove('is-loading'); deepLink(); }
  setTimeout(() => {
    loaderEl.style.display = 'none';
    document.body.classList.remove('is-loading');
    storageSet('sessionStorage', 'wn_loader', '1');
    deepLink();
  }, 1900);
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .15 });
  $$('.st,[data-reveal],.ft-line,.ft-cta').forEach(el => io.observe(el));
  /* марки на CSS */
  const track = $('#marquee');
  if (track) track.style.animation = 'marqueeX 26s linear infinite';
  $('.to-top')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ============================================================
   КОРЗИНА
   ============================================================ */
/* Локальная корзина — только черновик, не подтверждение заказа или цены.
   Восстанавливаем поля исключительно из каталога, проверяя ID и количество. */
const MAX_CART_QTY = 99;
let storedCart = [];
let cartWasUpdated = false;
try {
  const raw = storageGet('localStorage', 'wn_cart');
  if (raw && raw.length > 16384) cartWasUpdated = true;
  else if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) storedCart = parsed;
    else cartWasUpdated = true;
  }
} catch (_) { cartWasUpdated = true; }
let cart = [];
if (storedCart.length > GOODS.length * 4) cartWasUpdated = true;
for (const item of storedCart.slice(0, GOODS.length * 4)) {
  const g = item && typeof item === 'object' && GOODS.find(x => x.id === item.id);
  const qty = Number(item && item.qty);
  // Не подменяем месяц годовой подпиской или другой товар под тем же ID.
  if (!g || !Number.isFinite(g.price) || item.name !== g.name || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_CART_QTY) {
    cartWasUpdated = true;
    continue;
  }
  if (Number(item.price) !== g.price) cartWasUpdated = true;
  const previous = cart.find(x => x.id === g.id);
  if (previous) {
    previous.qty = Math.min(MAX_CART_QTY, previous.qty + qty);
    cartWasUpdated = true;
  } else {
    cart.push({ id: g.id, qty, name: g.name, price: g.price, img: g.img || CAT_IMG[g.cat] });
  }
}
if (cartWasUpdated) {
  storageSet('localStorage', 'wn_cart', JSON.stringify(cart));
  storageSet('sessionStorage', 'wn_cart_review', '1');
}
const save = () => storageSet('localStorage', 'wn_cart', JSON.stringify(cart));
const goodImg = id => { const g = GOODS.find(x => x.id === id); return g ? (g.img || CAT_IMG[g.cat]) : ''; };
const total = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const qtyAll = () => cart.reduce((n, i) => n + i.qty, 0);
function addToCart(id) {
  const g = GOODS.find(x => x.id === id);
  if (!g || !Number.isFinite(g.price)) { toast('Уточните цену у менеджера'); return; }
  const item = cart.find(i => i.id === id);
  if (item && item.qty >= MAX_CART_QTY) { toast('Не более 99 одинаковых позиций в корзине'); return; }
  if (item) item.qty++; else cart.push({ id, qty: 1, name: g.name, price: g.price, img: g.img || CAT_IMG[g.cat] });
  save(); paintQty(); toast(`✓ «${g.name}» — в корзине`);
  setTimeout(openCart, 260);
}
function paintQty() {
  const n = qtyAll();
  $('#menuCartQty').textContent = n;
  const chip = $('#cartChipQty'); if (chip) chip.textContent = n;
}
paintQty();
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) addToCart(add.dataset.add);
  const cmin = e.target.closest('[data-cmin]'), cplus = e.target.closest('[data-cplus]'), rm = e.target.closest('[data-rm]');
  if (cmin) change(cmin.dataset.id, -1);
  if (cplus) change(cplus.dataset.id, 1);
  if (rm) change(rm.dataset.id, -999);
});
function change(id, d) {
  const it = cart.find(i => i.id === id); if (!it) return;
  if (d > 0 && it.qty >= MAX_CART_QTY) { toast('Не более 99 одинаковых позиций в корзине'); return; }
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(i => i.id !== id);
  save(); paintQty(); stepCart();
}
const cartOverlay = $('#cartOverlay');
function openCart() { cartOverlay.classList.add('open'); cartOverlay.setAttribute('aria-hidden', 'false'); stepCart(); if (lenis) lenis.stop(); }
function closeCart() { if (!cartOverlay) return; cartOverlay.classList.remove('open'); cartOverlay.setAttribute('aria-hidden', 'true'); if (lenis && !menuOpen) lenis.start(); }
$('#openCart')?.addEventListener('click', openCart);
// Кнопка в пустой корзине создаётся динамически, поэтому закрываем через делегирование.
cartOverlay?.addEventListener('click', e => {
  if (e.target.closest('[data-cart-close]')) closeCart();
});
function stepCart() {
  const body = $('#cartBody');
  const cartNotice = storageGet('sessionStorage', 'wn_cart_review')
    ? '<p style="color:#fff;font-size:13px;margin:0 0 16px">Каталог обновился: некоторые цены или товары могли измениться. Пожалуйста, проверьте корзину.</p>'
    : '';
  storageRemove('sessionStorage', 'wn_cart_review');
  if (!cart.length) {
    body.innerHTML = `${cartNotice}<div class="empty-cart"><b>Здесь пока пусто</b><span>Посмотрите подписки и Telegram-товары в витрине.</span>
      <a class="btn-chip" href="shop.html#catalog" data-cart-close><span class="btn-label">К витрине</span><span class="btn-arrow">→</span></a></div>`;
    return;
  }
  body.innerHTML = `
    <h3 style="font-family:var(--f-disp);font-size:24px;margin-bottom:6px">Ваш заказ</h3>
    ${cartNotice}
    <p style="color:var(--grey);font-size:13px;margin-bottom:20px">Оплата на сайте подключается. Пока заказ можно оформить в Telegram-боте.</p>
    ${cart.map(i => `
      <div class="cart-line">
        <img class="cart-thumb" src="${i.img || goodImg(i.id)}" alt="">
        <div><h4>${i.name}</h4><span class="unit">${money(i.price)} × ${i.qty}</span>
          <div class="qty"><button data-cmin="${i.id}">−</button><b>${i.qty}</b><button data-cplus="${i.id}">+</button></div></div>
        <div class="cart-right"><span class="cart-total">${money(i.price * i.qty)}</span>
          <button class="rm" data-rm="${i.id}">убрать</button></div>
      </div>`).join('')}
    <div class="cart-summary">
      <div class="cart-grand"><span>Итого</span><b>${money(total())}</b></div>
      <p style="color:var(--grey);font-size:13px;line-height:1.55">Корзина сайта пока не передаётся в бот — выберите эти товары там ещё раз, если они доступны, или уточните у менеджера.</p>
      <a class="btn-chip" href="https://t.me/webnicss_bot" target="_blank" rel="noopener noreferrer" style="justify-content:center"><span class="btn-label">Оформить в Telegram-боте ↗</span></a>
    </div>`;
}
/* ============================================================
   ТОСТЫ
   ============================================================ */
const toastBox = document.createElement('div');
toastBox.className = 'toasts';
document.body.appendChild(toastBox);
function toast(message) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = message;
  toastBox.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 420); }, 2600);
}

# PROJECT_CONTEXT.md

## Проект
- **Название**: aqualang.pro
- **Тип**: личный сайт-лендинг (single-page)
- **Цель**: продавать услуги Макса как ИИ-инженера/автоматизатора, ловить заявки в Telegram, демонстрировать AI-чат как dogfooding продукта
- **Владелец**: Макс (aqualang89, energycat77@gmail.com)

## Стратегия
Сайт работает как **хаб**: на каждом сделанном Максом проекте будет ссылка "Powered by AQUALANG" → aqualang.pro. Это значит лендинг должен быть конверсионным и быстрым.

## Стек
- **Frontend**: vanilla HTML / CSS / JS (без фреймворков)
- **Анимации**: Three.js (hero), Lenis (smooth scroll) — уже подключены через CDN
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: не нужна
- **Auth**: не нужна
- **AI-чат**: Perplexity API (через serverless-прокси, ключ в env)
- **Заявки**: Telegram Bot API (бот Макс создаст позже, токен/chat_id в env)
- **Деплой**: Vercel, домен aqualang.pro (Макс покупает 2026-04-28)
- **Шрифты**: Fraunces (serif), JetBrains Mono, Manrope — Google Fonts
- **i18n**: RU/EN — оставляем переключатель из прототипа

## База / референс
`site-a-v2.html` (1132 строки, всё в одном файле) — готовый дизайн-прототип. Берём как источник верстки/стилей/анимаций. После переноса в структуру — перемещается в `_reference/` или удаляется.

## Структура папок (целевая)
```
aqualang.pro/
├── index.html              # главная (single page)
├── styles/
│   ├── base.css            # ресет, шрифты, переменные
│   ├── layout.css          # nav, hero, sections, footer
│   └── components.css      # card, form, marquee, faq
├── scripts/
│   ├── main.js             # init, smooth scroll, cursor, i18n
│   ├── hero-three.js       # Three.js hero сцена
│   ├── chat-widget.js      # AI-чат виджет (Perplexity)
│   └── form.js             # отправка заявки в TG
├── api/
│   ├── chat.js             # serverless: прокси к Perplexity
│   └── contact.js          # serverless: отправка заявки в TG
├── public/
│   ├── favicon.svg
│   ├── og.png              # OG-карточка
│   ├── robots.txt
│   └── sitemap.xml
├── _reference/
│   └── site-a-v2.html      # исходный прототип
├── vercel.json
├── .env.example
├── .gitignore
├── README.md
├── PROJECT_CONTEXT.md      # этот файл
├── PROJECT_STATE.md
└── STATE.md                # лог решений (не коммитить)
```

## Модули
- **hero-three**: Three.js сфера в hero, drag/click/R/M-хоткеи. Не разгонять — должно работать на мобилке.
- **chat-widget**: AI-чат, кнопка-пузырь снизу справа, открывает overlay. Бэк через `/api/chat`.
- **form**: контакт-форма, валидация, POST на `/api/contact`, успех/ошибка inline.
- **i18n**: RU/EN переключатель через `data-ru`/`data-en` атрибуты (как в прототипе).
- **nav**: фикс-навбар с mix-blend-mode, логотип-aqualang, ссылки-якоря.

## Стайл-гайд (зафиксированные правки прототипа)
- **Логотип в навбаре**: переделать как в футере — `aqualang` слитно, всё строчными, "lang" курсивом, без пульсирующего blob-кружка слева. (Сейчас сверху: `[blob] Aqua lang` — выглядит разорвано. Снизу: `aqualang` — нравится, делаем так везде.)
- **E-mail в контактах**: уточнить у Макса реальный (сейчас в прототипе `hi@aqualang.dev` — это плейсхолдер).
- **Telegram-юзернейм**: уточнить у Макса (сейчас `@aqualang`).
- **Цены в FAQ**: оставляем как есть (50к/120к/80к ₽), правим позже.

## SEO
- Meta: title, description, keywords (RU + EN)
- OpenGraph + Twitter Cards (og:image 1200x630)
- JSON-LD Person/ProfessionalService
- robots.txt + sitemap.xml
- canonical URL
- prefers-color-scheme dark
- favicon (svg + ico)

## Производительность
- **Цель**: Lighthouse 90+ на мобиле
- Анимации не разгонять — мобайл важнее визуальных понтов
- Three.js — лениво или сразу, но с throttle на ресайз и низким polycount
- Lazy-load всё что вне viewport
- Шрифты: preconnect + display=swap (уже есть)
- Картинки: webp/avif, размеры заданы

## Правила
- Никаких изменений архитектуры без согласования с Максом
- Код production-ready, без TODO/console.log в проде
- Функции модульные, файлы маленькие (300-400 строк max)
- Новые зависимости — только с явного одобрения Макса (минимум зависимостей, vanilla = принцип)
- Все ключи и токены — в `.env`, в git только `.env.example`
- НЕ ставить immutable cache без хешей в именах файлов (правило Макса)

## Стандарты кода
- Язык: HTML5 + современный CSS + ES2020+
- Стиль: естественный, без избыточных комментариев и абстракций (правило Макса)
- Имена: короткие где уместно (`el`, `btn`, `idx`)
- Тесты: нет (для лендинга не нужны, ручная проверка через Playwright MCP при необходимости)
- Коммиты на русском, в стиле Макса ("фикс кеша", не "fix: resolve caching")

## Что отложено / открытые вопросы
- Telegram bot token + chat_id (Макс пришлёт позже)
- Реальный e-mail и Telegram-юзернейм для контактов
- Кейсы — пока не делаем (проекты не доделаны)
- Финальные цены и тексты — пилим прототип, шлифуем позже

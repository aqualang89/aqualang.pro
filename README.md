# aqualang.pro

Личный сайт-лендинг Макса. ИИ-инженер, автоматизация, сайты под ключ.

## Стек

Vanilla HTML/CSS/JS. Three.js (hero), Lenis (smooth scroll). Vercel Serverless для AI-чата (Perplexity) и формы (Telegram). Без БД, без auth.

## Структура

```
aqualang.pro/
├── index.html
├── styles/   base.css, layout.css, components.css
├── scripts/  main.js, hero-three.js, chat-widget.js, form.js
├── api/      chat.js (Perplexity), contact.js (Telegram)
├── public/   favicon.svg, og.svg, robots.txt, sitemap.xml
├── vercel.json
└── .env.example
```

## Локально

Просто открыть `index.html` через любой статик-сервер (например `npx serve`). API-эндпоинты заработают только на Vercel или через `vercel dev`.

```bash
npx vercel dev
```

## Переменные окружения

Скопировать `.env.example` → `.env` и заполнить:

- `PERPLEXITY_API_KEY` — ключ Perplexity Sonar (для AI-чата)
- `TELEGRAM_BOT_TOKEN` — токен TG-бота (для заявок)
- `TELEGRAM_CHAT_ID` — куда слать заявки

Без `TELEGRAM_*` форма работает в режиме заглушки (логирует в консоль и возвращает ok).

## Деплой

Через `/deploy` или вручную:

```bash
vercel --prod
```

Подключить домен `aqualang.pro` в дашборде Vercel.

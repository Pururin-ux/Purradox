# Запуск Purradox

## Разработка на Windows

Установи Node.js 22 с Corepack и Python 3.12. Из корня репозитория в PowerShell установи зависимости и запусти приложение.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -c source/backend/requirements.txt fastapi uvicorn python-dotenv pytest pytest-xdist requests
Push-Location source/frontend
corepack yarn install --frozen-lockfile
Pop-Location
.\start-local.cmd
```

API доступен на `127.0.0.1:4183`, фронтенд на `127.0.0.1:4184`. Повторный запуск использует сервисы той же рабочей копии, ревизии Git и пары портов. Для другой копии задай свободные порты в том же окне PowerShell.

```powershell
$env:PURRADOX_API_PORT = "4283"
$env:PURRADOX_FRONTEND_PORT = "4284"
.\start-local.cmd
```

Для Visual Edits задай `ENABLE_VISUAL_EDITS=true` до запуска сервера разработки. Чтобы запустить только API из виртуального окружения, выполни из корня репозитория следующее.

```powershell
$env:CORS_ORIGINS = "http://127.0.0.1:4184,http://localhost:4184"
.\.venv\Scripts\python.exe -m uvicorn server:app --app-dir source/backend --host 127.0.0.1 --port 4183
```

## Размещение

Собери фронтенд командой `corepack yarn build` из `source/frontend` и опубликуй содержимое `source/frontend/build`. При сборке без `REACT_APP_BACKEND_URL` браузер обращается к `/api` на адресе сайта. Настрой хост так, чтобы запросы `/api` и `/api/*` попадали в FastAPI с исходным путём, а внутренние страницы приложения открывали `index.html` при прямом переходе и перезагрузке. Отсутствующие файлы должны получать обычный ответ 404.

Пример блока nginx для сборки в `/srv/purradox` и API на том же сервере.

```nginx
server {
    root /srv/purradox;
    index index.html;

    location ~ ^/api(?:/|$) {
        proxy_pass http://127.0.0.1:4183;
    }

    location ~ ^/(?:static|art|fonts)(?:/|$)|\.[^/]+$ {
        try_files $uri =404;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

При размещении API на отдельном адресе укажи его HTTP(S)-адрес без `/api` в `REACT_APP_BACKEND_URL` при сборке. В окружении FastAPI задай `CORS_ORIGINS` со списком адресов фронтенда через запятую. На опубликованном сайте проверь прямое открытие и перезагрузку урока, тренажёра, повторения и варианта ЦТ.

При смене адреса сначала открой профиль на прежнем сайте и нажми «Скачать файл». На новом адресе нажми «Выбрать файл», сверь код на обоих экранах и подтверди замену. Проверь, что нужный черновик открывается в точке, где ты остановился.

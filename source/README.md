# Запуск Purradox

Из корня репозитория установи зависимости API и тестов в виртуальное окружение Python 3.12. CI использует тот же набор с версиями из `source/backend/requirements.txt`.

```sh
python -m pip install -c source/backend/requirements.txt fastapi uvicorn motor python-dotenv pytest pytest-xdist requests
```

Установи зависимости фронтенда из `source/frontend` командой `corepack yarn install --frozen-lockfile`. На Windows `start-local.cmd` запускает API на `127.0.0.1:4183` и фронтенд на `127.0.0.1:4184`. Для Visual Edits задай `ENABLE_VISUAL_EDITS=true` в окружении перед запуском сервера разработки.

При сборке без `REACT_APP_BACKEND_URL` браузер обращается к `/api` на адресе сайта. Прокси сайта должен передавать `/api/*` в FastAPI с сохранением пути. Если API обслуживается на другом адресе, при сборке укажи `REACT_APP_BACKEND_URL` с базовым HTTP(S)-адресом API, а в окружении FastAPI задай `CORS_ORIGINS` с адресом фронтенда. Несколько адресов разделяются запятыми. Сам FastAPI читает `MONGO_URL` и `DB_NAME` при запуске.

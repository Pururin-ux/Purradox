# Карта Purradox

Purradox — учебник и тренажёр по физике для ЦТ. React, рисунки и локальный прогресс находятся в `source/frontend/`. FastAPI и материалы курса находятся в `source/backend/`. О назначении сайта и принятых визуальных решениях смотри [PRODUCT.md](PRODUCT.md) и [DESIGN.md](DESIGN.md).

## Где работать

Этот репозиторий объединяет рабочую версию `purradox-repair` и отдельную копию для GitHub. Последующие правки делай здесь. Старая рабочая копия служит источником истории и исходников арта.

По умолчанию сайт открывается на `127.0.0.1:4184`, API — на `127.0.0.1:4183`. Перед проверкой сверь корень Git и адрес. Заголовок `X-Purradox-Checkout` помогает отличить серверы разных копий. Локальные правки видны в `git status --short`. [Запуск](LOCAL_RUN.md) · [Проверка рабочей копии при запуске](local/dev.cjs)

## С чего начать по задаче

| Задача | Где смотреть | Ближайшая проверка |
| --- | --- | --- |
| Текст, условие, ключ ответа, разбор | [Курс](source/backend/curriculum/), [assessment.py](source/backend/assessment.py), [server.py](source/backend/server.py) | Пересчитать ответ независимо и проверить проблемную задачу. Общая сверка банка в [validate_course.py](scripts/full-site/validate_course.py). |
| Карточка урока, рисунок, лаборатория | [LessonA](source/frontend/src/variants/a/LessonA.jsx), [cardsA](source/frontend/src/variants/a/cardsA.jsx), [lessonEditorial](source/frontend/src/lib/lessonEditorial.js), [studyModels](source/frontend/src/lib/studyModels.js), [карта иллюстраций](docs/textbook-visual-review.md) | Открыть карточку через обычный урок в браузере. Сверить рисунок и показания при изменении параметров, проверить телефон. |
| Тренажёр и повторение ошибок | [TrainerA](source/frontend/src/variants/a/TrainerA.jsx), [useAnswer](source/frontend/src/components/shared/useAnswer.js), [ReviewA](source/frontend/src/variants/a/ReviewA.jsx) | Повторить ввод, вердикт и открытие разбора для затронутых задач. [Карта задач](docs/trainer-task-review.md) |
| Бланк, таймер и отчёты ЦТ | [exams.py](source/backend/exams.py), [CtA](source/frontend/src/variants/a/CtA.jsx), [useCtExam](source/frontend/src/components/shared/useCtExam.js), [ctDraft](source/frontend/src/lib/ctDraft.js) | В зависимости от правки проверить сдачу, повторное открытие и сохранение таймера. [Проверка восстановления](checks/ct-resume.cjs) |
| Сохранения, награды и перенос профиля | [progressStorage](source/frontend/src/lib/progressStorage.js), [draftStore](source/frontend/src/lib/draftStore.js), [game](source/frontend/src/lib/game.js), [profileTransfer](source/frontend/src/lib/profileTransfer.js) | Воспроизвести конкретный отказ записи, старое сохранение или две вкладки в тестовом профиле. [Проверка переноса](checks/profile-transfer.cjs) |
| Магазин и коллекция | [ShopA](source/frontend/src/variants/a/ShopA.jsx), [каталог предметов](source/frontend/src/lib/artifacts.js), [game](source/frontend/src/lib/game.js) | Проверить покупку или капсулу в отдельном профиле и обновить страницу. |
| Общая оболочка и маршруты | [VariantA](source/frontend/src/variants/a/VariantA.jsx), [ShellA](source/frontend/src/variants/a/ShellA.jsx), [общие компоненты](source/frontend/src/components/ui/) | Открыть экран по прямой ссылке и из навигации. Для профиля проверить возврат фокуса и состояние страницы под окном. |
| Сборка и публикация | [Инструкция размещения](source/README.md), [GitHub Actions](.github/workflows/ci.yml) | Проверить сборку или контракт API, затронутый изменением. Для сравнения пакетов использовать одинаковые версии Node и параметры сборки. |

## Передача работы

- В новом чате достаточно указать задачу и рабочую папку. [AGENTS.md](AGENTS.md) направит к этой карте. Проектный навык `purradox-workflow` помогает восстановить состояние после смены ветки, агента или чата.
- При передаче незавершённой работы запиши ветку, затронутые файлы, последнее проверенное состояние и ближайшее действие. Для визуальной задачи укажи URL, карточку и состояние экрана. Для сохранения — тип черновика, версию данных и последовательность действий.
- Принятые решения фиксируй в [PRODUCT.md](PRODUCT.md) или [DESIGN.md](DESIGN.md). [Журнал разработки](DEVELOPMENT.md) хранит датированные изменения и результаты проверок.
- Для браузерных проверок доступен Chrome DevTools Local QA. GitHub пригодится для сверки опубликованной ветки, CI и PR. Состояние незакоммиченных файлов проверяется локальным Git.

## Открытые вопросы по сохранениям

Запись из разных вкладок координируется через Web Locks или IndexedDB. При отсутствии обоих API запись опирается на проверку предыдущего значения. Ключ черновика демо ЦТ зависит от всего ответа API. Если редактируешь демо, проверь открытие ранее сохранённой попытки в отдельном профиле браузера. [Блокировка записи](source/frontend/src/lib/progressLock.js) · [Хранилище профиля](source/frontend/src/lib/progressStorage.js) · [Ключ ЦТ](source/frontend/src/lib/ctDraft.js) · [Демо ЦТ](source/backend/server.py)

## Архив

Снятый сюжет, скрипты переноса и прежние редакции больших документов хранятся отдельно в локальном архиве `purradox-legacy-archive`. В `manifest.json` сохранены относительные пути, размеры и контрольные суммы. Старые адреса `/story/*` ведут в тренажёр. Для иллюстраций, которых касается текущая работа, смотри [каталог арта и референсов](art-direction/README.md).

Edge of the Force: Jedi vs Sith — готовый статический сайт v2

Что изменено:
- Добавлены ваши изображения:
  assets/banner.png — баннер проекта
  assets/logo-character.jpeg — логотип/постер проекта
- Все документы теперь находятся на самом сайте.
- Карточки документов ведут на разделы внутри index.html, а не на внешние ссылки.
- Сайт не требует Node.js, React, npm или сборки.

Как залить на Vercel через GitHub:
1. Распакуйте архив.
2. Загрузите содержимое папки eotf_jvs_site_ready в корень GitHub-репозитория.
3. В корне должны лежать index.html и папка assets.
4. В Vercel выберите Add New Project и подключите репозиторий.
5. Framework Preset: Other.
6. Build Command: оставить пустым.
7. Output Directory: ./ или оставить пустым.
8. Deploy.

Как залить на обычный хостинг:
1. Распакуйте архив.
2. Загрузите содержимое папки eotf_jvs_site_ready в public_html / www.
3. Важно: index.html должен лежать прямо в корне сайта.

Что заменить вручную в index.html:
- connect 0.0.0.0:27015 — на реальный IP сервера
- discord.gg/your-link — на реальную ссылку Discord
- Steam Workshop — на ссылку коллекции аддонов
- Тексты правил/лора можно расширять прямо в секциях #rules и #lore.

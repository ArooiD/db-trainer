// Ленивая загрузка Markdown-тела лекции из public/lectures/<курс>/<файл>.
// Кэшируется в памяти, чтобы повторный выбор темы не дёргал сеть.
// Путь резолвится относительно каталога приложения (там же, где index.html),
// поэтому работает и на корневом домене, и на GitHub Pages /project/.

const cache = new Map();

function appBase() {
  const { pathname } = window.location;
  const dir = pathname.endsWith("/") ? pathname : pathname.replace(/[^/]*$/, "");
  return new URL(dir, window.location.origin).toString();
}

export function lectureUrl(course, file) {
  return new URL(`lectures/${course}/${file}`, appBase()).toString();
}

export function loadLectureContent(course, file) {
  const key = `${course}/${file}`;
  if (cache.has(key)) return cache.get(key);
  const promise = fetch(lectureUrl(course, file)).then((response) => {
    if (!response.ok) throw new Error(`Не удалось загрузить лекцию (${response.status})`);
    return response.text();
  });
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

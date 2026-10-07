import { Dashboard } from './js/Dashboard.js';
import { ToDoWidget } from './js/ToDoWidget.js';
import { QuoteWidget } from './js/QuoteWidget.js';
import { PriceWidget } from './js/PriceWidget.js';
import { PlayerCountWidget } from './js/PlayerCountWidget.js';

/* ===================== Виджеты ===================== */
function initDashboard() {
  const grid = document.querySelector('#widget-grid');
  if (!grid) return null;

  const dashboard = new Dashboard(grid, {
    todo: ToDoWidget,
    quote: QuoteWidget,
    price: PriceWidget,
    players: PlayerCountWidget,
  });

  dashboard.addWidget('price');
  dashboard.addWidget('players');

  document.querySelectorAll('[data-add-widget]').forEach((button) => {
    button.addEventListener('click', () => {
      dashboard.addWidget(button.dataset.addWidget);
    });
  });

  return dashboard;
}

/* ===================== Избранное скинов ===================== */
const FAV_KEY = 'cs2hub:favorites';

function readFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeFavorites(set) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  } catch {
    /* localStorage может быть выключен — просто игнорируем */
  }
}

function initFavorites() {
  const favorites = readFavorites();
  const buttons = document.querySelectorAll('.skin-card__fav');

  buttons.forEach((button) => {
    const card = button.closest('.skin-card');
    const id = card?.dataset.skinId;
    if (!id) return;

    // восстановить состояние из localStorage
    const isFav = favorites.has(id);
    button.setAttribute('aria-pressed', String(isFav));
    button.textContent = isFav ? '♥' : '♡';

    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      const next = !pressed;
      button.setAttribute('aria-pressed', String(next));
      button.textContent = next ? '♥' : '♡';

      if (next) favorites.add(id);
      else favorites.delete(id);
      writeFavorites(favorites);

      applySkinFilter();
    });
  });
}

/* ===================== Фильтр скинов (вкладки + качество + избранное) ===================== */
const state = {
  tab: 'popular',
  wear: 'all',
  query: '',
};

function applySkinFilter() {
  const favorites = readFavorites();
  const cards = document.querySelectorAll('.skin-card');
  let visible = 0;

  cards.forEach((card) => {
    const id = card.dataset.skinId;
    const wear = card.dataset.wear || '';
    const name = (card.querySelector('.skin-card__name')?.textContent || '').toLowerCase();
    const delta = card.dataset.delta || ''; // 'up' | 'down'
    const isNew = card.dataset.isNew === 'true';

    let ok = true;

    // Вкладка
    switch (state.tab) {
      case 'rising':  ok = delta === 'up'; break;
      case 'falling': ok = delta === 'down'; break;
      case 'new':     ok = isNew; break;
      case 'favorites': ok = favorites.has(id); break;
      case 'popular':
      default: ok = true;
    }

    // Качество
    if (ok && state.wear !== 'all') {
      ok = wear === state.wear;
    }

    // Поиск
    if (ok && state.query) {
      ok = name.includes(state.query);
    }

    card.hidden = !ok;
    if (ok) visible += 1;
  });

  // Сообщение «ничего не найдено»
  const grid = document.querySelector('.skin-cards');
  let empty = grid?.querySelector('.skin-cards__empty');
  if (visible === 0) {
    if (!empty && grid) {
      empty = document.createElement('p');
      empty.className = 'skin-cards__empty';
      empty.textContent = 'Ничего не найдено по выбранным фильтрам.';
      grid.appendChild(empty);
    }
  } else if (empty) {
    empty.remove();
  }
}

function initSkinTabs() {
  const tabs = document.querySelectorAll('.tabs__item');
  const select = document.querySelector('.tabs__select');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      state.tab = tab.dataset.tab || 'popular';
      applySkinFilter();
    });
  });

  if (select) {
    select.addEventListener('change', () => {
      const value = select.value;
      // проставляем data-wear на опциях в HTML: см. правку index.html ниже
      state.wear = value === 'all' ? 'all' : value;
      applySkinFilter();
    });
  }

  applySkinFilter();
}

/* ===================== Поиск ===================== */
function initSearch() {
  const input = document.querySelector('.topbar__search input');
  if (!input) return;

  input.addEventListener('input', () => {
    state.query = input.value.trim().toLowerCase();
    applySkinFilter();
  });

  // Ctrl/Cmd + K — фокус в поиск
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ===================== Плавная навигация по сайдбару ===================== */
function initSidebarNav() {
  document.querySelectorAll('.sidebar__link').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') {
      // «Главная» и прочие без цели — скроллим наверх и снимаем дефолт
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActive(link);
      });
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      // Цели нет — убираем мёртвую ссылку, чтобы не вводить в заблуждение
      link.style.opacity = '0.5';
      link.style.pointerEvents = 'none';
      return;
    }

    link.addEventListener('click', (e) => {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(link);
    });
  });

  function setActive(link) {
    document.querySelectorAll('.sidebar__link').forEach((l) => {
      l.classList.toggle('sidebar__link--active', l === link);
    });
  }
}

/* ===================== Уведомления (колокольчик) ===================== */
function initBell() {
  const bell = document.querySelector('.topbar__bell');
  if (!bell) return;

  bell.addEventListener('click', () => {
    // Переключаем «активное» состояние и показываем простой тост
    const hasNew = bell.dataset.new !== 'false';
    bell.dataset.new = hasNew ? 'false' : 'true';
    showToast(hasNew ? 'Новых уведомлений нет' : 'У вас 3 новых уведомления');
  });
}

/* ===================== Простой тост ===================== */
let toastEl = null;
let toastTimer = null;

function showToast(text) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('toast--visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('toast--visible');
  }, 2200);
}

/* ===================== Аватар / профиль (просто тост-заглушка) ===================== */
function initUserMenu() {
  const user = document.querySelector('.topbar__user');
  if (!user) return;
  user.addEventListener('click', () => {
    showToast('Профиль: скоро будет отдельная страница');
  });
}

/* ===================== Старт ===================== */
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  initSkinTabs();
  initFavorites();
  initSearch();
  initSidebarNav();
  initBell();
  initUserMenu();
});

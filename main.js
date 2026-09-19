import { Dashboard } from './js/Dashboard.js';
import { ToDoWidget } from './js/ToDoWidget.js';
import { QuoteWidget } from './js/QuoteWidget.js';
import { PriceWidget } from './js/PriceWidget.js';
import { PlayerCountWidget } from './js/PlayerCountWidget.js';

function initDashboard() {
  const grid = document.querySelector('#widget-grid');
  if (!grid) return;

  const dashboard = new Dashboard(grid, {
    todo: ToDoWidget,
    quote: QuoteWidget,
    price: PriceWidget,
    players: PlayerCountWidget,
  });

  // Стартовый набор — повторяет расположение из макета: курс и онлайн.
  dashboard.addWidget('price');
  dashboard.addWidget('players');

  // Кнопки "Добавить виджет …" — каждая просто вызывает метод дашборда,
  // сам main.js не знает, как устроен виджет внутри.
  document.querySelectorAll('[data-add-widget]').forEach((button) => {
    button.addEventListener('click', () => {
      dashboard.addWidget(button.dataset.addWidget);
    });
  });

  return dashboard;
}

function initSkinTabs() {
  const tabs = document.querySelectorAll('.tabs__item');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
    });
  });
}

function initFavoriteToggles() {
  document.querySelectorAll('.skin-card__fav').forEach((button) => {
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!pressed));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  initSkinTabs();
  initFavoriteToggles();
});

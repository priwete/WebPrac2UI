import { UIComponent } from './UIComponent.js';

let taskCounter = 0;

/**
 * ToDoWidget — список задач (перенесён из предыдущего задания и
 * инкапсулирован в класс). Данные хранятся как приватное свойство
 * экземпляра, наружу не торчат — управлять списком можно только
 * через методы виджета.
 */
export class ToDoWidget extends UIComponent {
  /** @type {{id:string, text:string, done:boolean}[]} */
  #tasks = [];

  constructor(config) {
    super({ ...config, title: config.title ?? 'Список задач' });
  }

  renderBody() {
    const wrap = document.createElement('div');
    wrap.className = 'todo';

    const form = document.createElement('form');
    form.className = 'todo__form';
    form.noValidate = true;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo__input';
    input.placeholder = 'Новая задача…';
    input.setAttribute('aria-label', 'Текст новой задачи');
    input.maxLength = 120;

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'btn btn--accent';
    addBtn.textContent = 'Добавить';

    form.append(input, addBtn);

    const list = document.createElement('ul');
    list.className = 'todo__list';

    const empty = document.createElement('p');
    empty.className = 'widget__empty';
    empty.textContent = 'Пока нет ни одной задачи.';

    wrap.append(form, empty, list);

    this._elements = { input, list, empty };
    this.#renderList();

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        this.addTask(input.value);
        input.value = '';
        input.focus();
      },
      { signal: this.signal }
    );

    // Делегирование: один обработчик на весь список вместо слушателя
    // на каждый пункт — удаление/отметка задач через data-атрибуты.
    list.addEventListener(
      'click',
      (event) => {
        const li = event.target.closest('li[data-task-id]');
        if (!li) return;
        const taskId = li.dataset.taskId;
        if (event.target.matches('[data-action="remove"]')) {
          this.removeTask(taskId);
        } else if (event.target.matches('[data-action="toggle"]')) {
          this.toggleTask(taskId);
        }
      },
      { signal: this.signal }
    );

    return wrap;
  }

  addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    taskCounter += 1;
    this.#tasks.push({ id: `task-${taskCounter}`, text: trimmed, done: false });
    this.#renderList();
  }

  removeTask(taskId) {
    this.#tasks = this.#tasks.filter((task) => task.id !== taskId);
    this.#renderList();
  }

  toggleTask(taskId) {
    const task = this.#tasks.find((task) => task.id === taskId);
    if (task) task.done = !task.done;
    this.#renderList();
  }

  #renderList() {
    const { list, empty } = this._elements;
    list.textContent = '';
    empty.hidden = this.#tasks.length > 0;

    for (const task of this.#tasks) {
      const li = document.createElement('li');
      li.dataset.taskId = task.id;
      li.className = 'todo__item' + (task.done ? ' todo__item--done' : '');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'todo__toggle';
      toggle.dataset.action = 'toggle';
      toggle.setAttribute('aria-pressed', String(task.done));
      toggle.setAttribute('aria-label', task.done ? 'Отметить как невыполненную' : 'Отметить как выполненную');
      toggle.textContent = task.done ? '✓' : '';

      const label = document.createElement('span');
      label.className = 'todo__text';
      label.textContent = task.text; // textContent — безопасно, без innerHTML

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'todo__remove';
      remove.dataset.action = 'remove';
      remove.setAttribute('aria-label', `Удалить задачу «${task.text}»`);
      remove.textContent = '🗑';

      li.append(toggle, label, remove);
      list.appendChild(li);
    }
  }
}

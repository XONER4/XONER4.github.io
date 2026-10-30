(() => {
  'use strict';

  const controls = document.querySelector('[data-prompt-controls]');
  const search = document.querySelector('#prompt-search');
  const cards = Array.from(document.querySelectorAll('[data-prompt-card]'));
  const filters = Array.from(document.querySelectorAll('[data-category-filter]'));
  const result = document.querySelector('#prompt-results');
  const empty = document.querySelector('#prompt-empty');
  const reset = document.querySelector('#prompt-reset');
  const copyStatus = document.querySelector('#copy-status');
  if (!controls || !search || !cards.length || !result || !empty || !copyStatus) return;

  const normalize = (text) => text.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  const indexedCards = cards.map((card) => ({
    card,
    category: card.dataset.category,
    text: normalize(card.textContent),
  }));
  let selectedCategory = 'all';
  let statusTimer;

  function applyFilters() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const item of indexedCards) {
      const categoryMatches = selectedCategory === 'all' || item.category === selectedCategory;
      const textMatches = words.every((word) => item.text.includes(word));
      item.card.hidden = !(categoryMatches && textMatches);
      if (!item.card.hidden) visible += 1;
    }
    for (const button of filters) {
      button.setAttribute('aria-pressed', String(button.dataset.categoryFilter === selectedCategory));
    }
    result.textContent = `Показано запросов: ${visible} из ${cards.length}.`;
    empty.hidden = visible !== 0;
  }

  function announce(text) {
    clearTimeout(statusTimer);
    copyStatus.textContent = text;
    statusTimer = setTimeout(() => { copyStatus.textContent = ''; }, 6500);
  }

  function fallbackCopy(text) {
    const previouslyFocused = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.className = 'copy-fallback';
    textarea.value = text;
    textarea.readOnly = true;
    textarea.tabIndex = -1;
    document.body.appendChild(textarea);
    let copied = false;
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      copied = typeof document.execCommand === 'function' && document.execCommand('copy');
    } catch {
      copied = false;
    } finally {
      textarea.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    }
    return copied;
  }

  function selectPrompt(element) {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  for (const button of filters) {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.categoryFilter;
      applyFilters();
    });
  }
  search.addEventListener('input', applyFilters);
  if (reset) {
    reset.addEventListener('click', () => {
      selectedCategory = 'all';
      search.value = '';
      applyFilters();
      search.focus();
    });
  }

  for (const button of document.querySelectorAll('[data-copy-prompt]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const card = button.closest('[data-prompt-card]');
      const prompt = card && card.querySelector('.prompt-text');
      if (!prompt) return;
      const text = prompt.textContent.trim();
      const title = card.querySelector('h3').textContent.trim();
      button.disabled = true;
      let copied = false;
      try {
        if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          try {
            await navigator.clipboard.writeText(text);
            copied = true;
          } catch {
            // Some browsers deny clipboard access; use the selection-based fallback.
          }
        }
        if (!copied) copied = fallbackCopy(text);
        if (copied) {
          announce(`Запрос «${title}» скопирован. Вставьте его в чат Honer AI.`);
        } else {
          const selected = selectPrompt(prompt);
          announce(selected
            ? 'Текст запроса выделен. Скопируйте его через меню браузера или сочетанием клавиш.'
            : 'Выделите текст запроса и скопируйте его через меню браузера.');
        }
      } finally {
        button.disabled = false;
      }
    });
  }
  controls.hidden = false;
  applyFilters();
})();

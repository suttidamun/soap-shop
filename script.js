/* ============================================================
   Toothgate — shared script
   Used by: product.html, order.html, admin.html
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Config ---------- */

  const PRODUCTS_URL = 'products.json';

  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxhJyNq730QAdOBwbyDhZ7WNBG1EEtL0TrGn-zAlpxh9GtUGzJWMH-myRkwGhS16hFZ5A/exec';

  const SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsxV2uGkqfcbhWNVU8byrNhgcCj-ejNPKNTrrakTEl5fO7mc9aN3gfuUTAKWIe6e-DPQmePCaJm1Kg/pub?gid=0&single=true&output=csv';

  const TASTES = ['spearmint', 'salt'];

  const TASTE_LABELS = {
    all: 'ทั้งหมด',
    spearmint: 'Spearmint',
    salt: 'Salt'
  };

  const ORDER_FIELDS = ['customerName', 'contact', 'items', 'total', 'note'];

  /* ---------- Helpers ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function showMessage(container, text) {
    container.innerHTML = '';
    container.appendChild(el('p', 'section-message', text));
  }

  async function loadProducts() {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('Failed to load products: ' + res.status);
    const data = await res.json();
    return Array.isArray(data.products) ? data.products : [];
  }

  /* ============================================================
     product.html — list, filter, order links
     ============================================================ */

  function createProductCard(product) {
    const card = el('article', 'product-card');

    // Image
    const media = el('div', 'product-card__media');
    const img = el('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    media.appendChild(img);

    // Taste dot (small accent only)
    const taste = el('div', 'product-card__taste');
    const dot = el('span', 'taste-dot taste-dot--' + product.taste);
    dot.setAttribute('aria-hidden', 'true');
    taste.appendChild(dot);
    taste.appendChild(document.createTextNode(TASTE_LABELS[product.taste] || product.taste));

    // Name & description
    const name = el('h3', 'product-card__name', product.name);
    const desc = el('p', 'product-card__desc', product.description);

    // Size & price
    const meta = el('div', 'product-card__meta');
    const size = el('span', 'product-card__size', product.size);
    const price = el('span', 'product-card__price');
    price.appendChild(document.createTextNode(String(product.price)));
    price.appendChild(el('span', null, 'บาท'));
    meta.appendChild(size);
    meta.appendChild(price);

    // Order link
    const itemLabel = product.name + ' - ' + product.size;
    const orderLink = el('a', 'btn btn--solid', 'สั่งซื้อ');
    orderLink.href =
      'order.html?item=' + encodeURIComponent(itemLabel) +
      '&price=' + encodeURIComponent(product.price);

    card.append(media, taste, name, desc, meta, orderLink);
    return card;
  }

  function renderProducts(container, products) {
    container.innerHTML = '';
    if (products.length === 0) {
      showMessage(container, 'ไม่พบสินค้าในหมวดนี้');
      return;
    }
    products.forEach(function (p) {
      container.appendChild(createProductCard(p));
    });
  }

  function buildFilterBar(filterBar, currentTaste, onChange) {
    filterBar.innerHTML = '';
    const options = ['all'].concat(TASTES);

    const buttons = options.map(function (taste) {
      const btn = el('button', 'btn', TASTE_LABELS[taste]);
      btn.type = 'button';
      btn.dataset.taste = taste;
      btn.addEventListener('click', function () {
        onChange(taste);
      });
      filterBar.appendChild(btn);
      return btn;
    });

    function setActive(taste) {
      buttons.forEach(function (btn) {
        const active = btn.dataset.taste === taste;
        btn.classList.toggle('btn--solid', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    setActive(currentTaste);
    return setActive;
  }

  async function initProductPage() {
    const list = document.getElementById('product-list');
    if (!list) return;

    const filterBar = document.getElementById('filter-bar');

    // ?mood=xxx → pre-select filter if xxx is a valid taste
    const mood = new URLSearchParams(window.location.search).get('mood');
    let currentTaste = TASTES.indexOf(mood) !== -1 ? mood : 'all';

    let products = [];
    try {
      products = await loadProducts();
    } catch (err) {
      console.error(err);
      showMessage(list, 'ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    function apply() {
      const filtered = currentTaste === 'all'
        ? products
        : products.filter(function (p) { return p.taste === currentTaste; });
      renderProducts(list, filtered);
      if (setActive) setActive(currentTaste);
    }

    let setActive = null;
    if (filterBar) {
      setActive = buildFilterBar(filterBar, currentTaste, function (taste) {
        currentTaste = taste;
        apply();
      });
    }

    apply();
  }

  /* ============================================================
     order.html — prefill from URL, submit to Apps Script
     ============================================================ */

  function initOrderPage() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const item = params.get('item');
    const price = params.get('price');

    const itemsInput = document.getElementById('items');
    const totalInput = document.getElementById('total');

    if (item !== null && itemsInput) itemsInput.value = item;
    if (price !== null && totalInput) totalInput.value = price;

    form.addEventListener('submit', submitOrder);
  }

  function submitOrder(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const payload = {};
    ORDER_FIELDS.forEach(function (id) {
      const field = document.getElementById(id);
      payload[id] = field ? field.value.trim() : '';
    });

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
  }

  /* ============================================================
     admin.html — read published Google Sheet (CSV), render table
     ============================================================ */

  // Own CSV parser: handles quoted fields, escaped quotes ("")
  // and line breaks inside quoted fields.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // ignore; \n ends the row
      } else {
        field += ch;
      }
    }

    // last field / row if file doesn't end with newline
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  // Parse timestamps like "24/11/2026 14:30:05" (dd/mm/yyyy, Buddhist year supported)
  // and fall back to Date.parse for ISO-like strings.
  function parseTimestamp(str) {
    if (!str) return null;
    const m = str.trim().match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (m) {
      let year = parseInt(m[3], 10);
      if (year > 2500) year -= 543; // พ.ศ. → ค.ศ.
      const d = new Date(
        year,
        parseInt(m[2], 10) - 1,
        parseInt(m[1], 10),
        parseInt(m[4] || '0', 10),
        parseInt(m[5] || '0', 10),
        parseInt(m[6] || '0', 10)
      );
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    const t = Date.parse(str);
    return isNaN(t) ? null : t;
  }

  // Sort newest first. Uses timestamps when every row has one,
  // otherwise assumes later rows in the sheet are newer.
  function sortNewestFirst(entries) {
    const allHaveTime = entries.every(function (e) { return e.time !== null; });
    if (allHaveTime) {
      return entries.sort(function (a, b) { return b.time - a.time; });
    }
    return entries.sort(function (a, b) { return b.index - a.index; });
  }

  const COLUMN_COUNT = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

  function renderOrdersTable(tbody, dataRows) {
    tbody.innerHTML = '';

    if (dataRows.length === 0) {
      const tr = el('tr');
      const td = el('td', null, 'ยังไม่มีคำสั่งซื้อ');
      td.colSpan = COLUMN_COUNT;
      td.className = 'empty-row';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    dataRows.forEach(function (cells) {
      const tr = el('tr');
      for (let c = 0; c < COLUMN_COUNT; c++) {
        const value = cells[c] !== undefined ? cells[c] : '';
        tr.appendChild(el('td', null, value));
      }
      tbody.appendChild(tr);
    });
  }

  async function initAdminPage() {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const loadingRow = el('tr');
    const loadingCell = el('td', null, 'กำลังโหลดข้อมูล...');
    loadingCell.colSpan = COLUMN_COUNT;
    loadingRow.appendChild(loadingCell);
    tbody.appendChild(loadingRow);

    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error('Failed to load sheet: ' + res.status);

      const text = (await res.text()).replace(/^\uFEFF/, '');
      const rows = parseCSV(text);

      // rows[0] is the header row; keep only non-empty data rows
      const dataRows = rows
        .slice(1)
        .filter(function (cells) {
          return cells.some(function (c) { return c.trim() !== ''; });
        });

      const entries = dataRows.map(function (cells, index) {
        return {
          cells: cells,
          index: index,
          time: parseTimestamp(cells[0])
        };
      });

      const sorted = sortNewestFirst(entries).map(function (e) { return e.cells; });
      renderOrdersTable(tbody, sorted);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '';
      const tr = el('tr');
      const td = el('td', null, 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้');
      td.colSpan = COLUMN_COUNT;
      td.className = 'empty-row';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  /* ---------- Boot ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    initProductPage();
    initOrderPage();
    initAdminPage();
  });
})();

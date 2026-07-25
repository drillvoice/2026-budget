/* GetAcross concept mockup — chart rendering and the two inert interactions.
   No dependencies, no network, no storage. */

(function () {
  'use strict';

  /* Illustrative figures, invented for this mockup. $ billions per financial year. */
  var SERIES = [
    { key: 'now',     label: 'Collected now',       cls: 'bar-1' },
    { key: 'royalty', label: 'Under a 10% royalty', cls: 'bar-2' }
  ];

  var DATA = [
    { year: '2020–21', now: 1.2, royalty: 4.8 },
    { year: '2021–22', now: 1.6, royalty: 6.9 },
    { year: '2022–23', now: 2.3, royalty: 7.4 },
    { year: '2023–24', now: 2.0, royalty: 6.6 },
    { year: '2024–25', now: 1.8, royalty: 6.2 }
  ];

  var SCALE_MAX = 8; /* round number above the largest value, so the gridlines mean something */

  function money(v) {
    return '$' + v.toFixed(1) + 'b';
  }

  function renderChart(root) {
    var frag = document.createDocumentFragment();

    DATA.forEach(function (row) {
      var line = document.createElement('div');
      line.className = 'chart-row';

      var year = document.createElement('span');
      year.className = 'chart-year';
      year.textContent = row.year;
      line.appendChild(year);

      var bars = document.createElement('div');
      bars.className = 'chart-bars';

      SERIES.forEach(function (series) {
        var value = row[series.key];
        var barLine = document.createElement('div');
        barLine.className = 'bar-line';
        barLine.tabIndex = 0;
        barLine.setAttribute('role', 'img');
        barLine.setAttribute('aria-label',
          row.year + ', ' + series.label + ': ' + money(value) + ' billion');
        var gap = row.royalty - row.now;
        barLine.dataset.tip = row.year + ' · ' + series.label + '|' + money(value) + '|' +
          (series.key === 'now'
            ? money(gap) + ' less than a 10% royalty would have returned'
            : money(gap) + ' more than was actually collected');

        /* The bar lives in its own track so the value label can never steal
           width from it — bar lengths stay proportional at any viewport. */
        var track = document.createElement('span');
        track.className = 'bar-track';

        var bar = document.createElement('span');
        bar.className = 'bar ' + series.cls;
        bar.style.width = (value / SCALE_MAX * 100) + '%';
        track.appendChild(bar);

        var val = document.createElement('span');
        val.className = 'bar-val';
        val.textContent = money(value);

        barLine.appendChild(track);
        barLine.appendChild(val);
        bars.appendChild(barLine);
      });

      line.appendChild(bars);
      frag.appendChild(line);
    });

    root.textContent = '';
    root.appendChild(frag);
  }

  function renderTable(body) {
    var rows = DATA.map(function (row) {
      return '<tr><th scope="row">' + row.year + '</th><td>' +
        money(row.now) + '</td><td>' + money(row.royalty) + '</td></tr>';
    });
    body.innerHTML = rows.join('');
  }

  /* Hover / focus layer for the chart. */
  function attachTooltip(root) {
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('role', 'presentation');
    document.body.appendChild(tip);

    var focused = null;

    function show(target, x, y) {
      var parts = (target.dataset.tip || '').split('|');
      tip.textContent = '';
      var head = document.createElement('span');
      head.textContent = parts[0];
      var value = document.createElement('strong');
      value.textContent = parts[1] || '';
      var context = document.createElement('span');
      context.textContent = parts[2] || '';
      tip.appendChild(head);
      tip.appendChild(value);
      tip.appendChild(context);
      tip.dataset.show = 'true';
      move(x, y);
    }

    function showAt(target) {
      var box = target.getBoundingClientRect();
      show(target, box.left + Math.min(box.width / 2, 220), box.top);
    }

    function move(x, y) {
      var pad = 14;
      var w = tip.offsetWidth;
      var left = Math.min(x + pad, window.innerWidth - w - 8);
      tip.style.left = Math.max(8, left) + 'px';
      tip.style.top = Math.max(8, y - tip.offsetHeight - pad) + 'px';
    }

    function hide() { tip.dataset.show = 'false'; }

    root.addEventListener('mousemove', function (e) {
      var target = e.target.closest('.bar-line');
      if (!target) { if (!focused) hide(); return; }
      show(target, e.clientX, e.clientY);
    });
    root.addEventListener('mouseleave', function () { if (!focused) hide(); });
    root.addEventListener('focusin', function (e) {
      var target = e.target.closest('.bar-line');
      if (!target) return;
      focused = target;
      showAt(target);
    });
    root.addEventListener('focusout', function () { focused = null; hide(); });

    /* Keyboard focus can itself scroll the page — follow the bar rather than
       dropping the tooltip the moment it appears. */
    window.addEventListener('scroll', function () {
      if (focused) { showAt(focused); return; }
      hide();
    }, { passive: true });
  }

  function wireTableToggle() {
    var button = document.querySelector('[data-table-toggle]');
    var panel = document.getElementById('chart-table');
    if (!button || !panel) return;

    button.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Hide the table' : 'Show the table';
    });
  }

  function wireSignup() {
    var form = document.querySelector('[data-signup]');
    var note = document.querySelector('[data-signup-note]');
    if (!form || !note) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      note.textContent = 'Nothing was sent — this is a mockup of the signup, not a working form.';
    });
  }

  var chart = document.querySelector('[data-chart]');
  var tableBody = document.querySelector('[data-table-body]');

  if (chart) {
    renderChart(chart);
    attachTooltip(chart);
  }
  if (tableBody) renderTable(tableBody);
  wireTableToggle();
  wireSignup();
})();

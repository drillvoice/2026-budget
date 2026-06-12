(async function () {
  "use strict";

  let quiz, statsById;
  try {
    const [quizRes, statsRes] = await Promise.all([
      fetch("data/quiz.json"),
      fetch("data/stats.json"),
    ]);
    quiz = await quizRes.json();
    const stats = (await statsRes.json()).stats;
    statsById = new Map(stats.map((s) => [s.id, s]));
    renderSources(stats);
  } catch (err) {
    document.getElementById("quiz").insertAdjacentHTML(
      "beforeend",
      '<p class="notice">Couldn’t load the quiz data. If you opened this file directly, serve it over HTTP (e.g. <code>python3 -m http.server</code>) — or just read the sections below.</p>'
    );
    return;
  }

  // Stable footnote numbering: order of appearance in stats.json
  const sourceNumber = new Map([...statsById.keys()].map((id, i) => [id, i + 1]));

  function citeHtml(ids) {
    return ids
      .map((id) => {
        const n = sourceNumber.get(id);
        return n
          ? `<sup class="cite"><a href="#src-${id}" aria-label="Source ${n}">[${n}]</a></sup>`
          : "";
      })
      .join("");
  }

  function renderSources(stats) {
    const list = document.getElementById("sources-list");
    list.innerHTML = stats
      .map(
        (s) => `<li id="src-${s.id}">${s.value}. <a href="${s.url}" rel="noopener">${s.source}</a> (${s.year}).` +
          (s.notes ? ` <span class="src-notes">${s.notes}</span>` : "") + "</li>"
      )
      .join("");
  }

  // Hydrate inline citation markers in the static copy
  document.querySelectorAll("sup.cite[data-cite]").forEach((sup) => {
    const id = sup.dataset.cite;
    const n = sourceNumber.get(id);
    if (n) sup.innerHTML = `<a href="#src-${id}" aria-label="Source ${n}">[${n}]</a>`;
  });

  // Render quiz questions
  const container = document.getElementById("quiz-questions");
  container.innerHTML = quiz.questions
    .map(
      (q) => `<fieldset>
        <legend>${q.text}</legend>
        ${q.options
          .map(
            (o) => `<div class="option">
              <input type="radio" name="${q.id}" id="${q.id}-${o.value}" value="${o.value}">
              <label for="${q.id}-${o.value}">${o.label}</label>
            </div>`
          )
          .join("")}
      </fieldset>`
    )
    .join("");

  const form = document.getElementById("quiz-form");

  // Gently advance to the next unanswered question when one is answered.
  // CSS `scroll-behavior: smooth` (with a reduced-motion override) governs the easing.
  form.addEventListener("change", (e) => {
    if (!e.target.matches('input[type="radio"]')) return;
    const fieldsets = [...form.querySelectorAll("fieldset")];
    const current = e.target.closest("fieldset");
    const next = fieldsets
      .slice(fieldsets.indexOf(current) + 1)
      .find((fs) => !fs.querySelector("input:checked"));
    if (next) next.scrollIntoView({ block: "center" });
  });
  const result = document.getElementById("quiz-result");
  const verdictsEl = document.getElementById("quiz-verdicts");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.querySelectorAll(".quiz-error").forEach((el) => el.remove());

    const answers = {};
    let complete = true;
    for (const q of quiz.questions) {
      const chosen = form.querySelector(`input[name="${q.id}"]:checked`);
      if (!chosen) {
        complete = false;
        q.fieldset = q.fieldset || form.querySelector(`input[name="${q.id}"]`).closest("fieldset");
        q.fieldset.insertAdjacentHTML(
          "beforeend",
          '<p class="quiz-error" role="alert">Please choose an answer.</p>'
        );
      } else {
        answers[q.id] = chosen.value;
      }
    }
    if (!complete) return;

    verdictsEl.innerHTML = quiz.questions
      .map((q) => {
        const v = quiz.verdicts[q.id][answers[q.id]];
        return `<article class="verdict" data-status="${v.status}">
          <p class="status">${quiz.statusLabels[v.status]}</p>
          <h4>${v.title}</h4>
          <p>${v.body}${citeHtml(v.cites)}</p>
          <p class="more"><a href="${v.link}">Read the full explainer</a></p>
        </article>`;
      })
      .join("");

    const b = quiz.benefits;
    document.getElementById("quiz-benefits").innerHTML = `
      <h4 class="benefits-heading">${b.heading}</h4>
      <p>${b.intro}</p>
      <ul class="benefits">
        ${b.items
          .map((it) => `<li><strong>${it.title}.</strong> ${it.body}${citeHtml(it.cites)}</li>`)
          .join("")}
      </ul>`;

    result.hidden = false;
    result.scrollIntoView({ block: "start" });
    result.querySelector("h3").setAttribute("tabindex", "-1");
    result.querySelector("h3").focus();
  });

  document.getElementById("quiz-reset").addEventListener("click", () => {
    form.reset();
    result.hidden = true;
    form.querySelectorAll(".quiz-error").forEach((el) => el.remove());
    document.getElementById("quiz").scrollIntoView({ block: "start" });
  });
})();

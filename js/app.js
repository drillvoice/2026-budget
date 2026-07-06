// Make Me Tomorrow's Front Page — front-end logic.
// Talks to /api/generate (Pages Function). No secrets here; the API key lives
// only on the server.

(function () {
  "use strict";

  // Where the campaign lives. Change these two for your deployment.
  var CAMPAIGN_URL = "makemethefrontpage.au";
  var PETITION_URL =
    "https://www.getup.org.au/campaigns/media-reform-2026/press-council/time-to-fix-australia-s-broken-media";

  var form = document.getElementById("story-form");
  var generateBtn = document.getElementById("generate");
  var statusEl = document.getElementById("status");
  var formError = document.getElementById("form-error");

  var resultSection = document.getElementById("result-section");
  var resultH = document.getElementById("result-h");
  var paper = document.getElementById("paper");
  var elDate = document.getElementById("paper-date");
  var elHeadline = document.getElementById("paper-headline");
  var elSubhead = document.getElementById("paper-subhead");
  var elBody = document.getElementById("paper-body");
  var elFooter = document.getElementById("paper-footer");

  var downloadBtn = document.getElementById("download");
  var againBtn = document.getElementById("again");

  var shareNativeBtn = document.getElementById("share-native");
  var shareX = document.getElementById("share-x");
  var shareFb = document.getElementById("share-fb");
  var shareWa = document.getElementById("share-wa");
  var shareCopyBtn = document.getElementById("share-copy");
  var shareStatus = document.getElementById("share-status");
  var howList = document.getElementById("how-list");
  var howDetails = document.getElementById("how");

  document.getElementById("petition-link").setAttribute("href", PETITION_URL);

  var TECH_NAMES = {
    "accusation-as-question": "Accusation as a question",
    "unnamed-sources": 'Unnamed "sources" & "critics"',
    "guilt-by-proximity": "Guilt by proximity",
    "friends-say": '"Friends say" construction',
  };

  function todayLong() {
    try {
      return new Date().toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return new Date().toDateString();
    }
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }
  function clearError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function setBusy(busy) {
    generateBtn.disabled = busy;
    generateBtn.textContent = busy ? "Going to press…" : "Print my front page";
    statusEl.textContent = busy ? "Writing your front page — this takes a few seconds…" : "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    var data = {
      first_name: form.first_name.value.trim(),
      role: form.role.value.trim(),
      place: form.place.value.trim(),
      mundane: form.mundane.value.trim(),
      wrongdoing: form.wrongdoing.value.trim(),
      about_self: form.about_self.checked,
      dial: (form.querySelector('input[name="dial"]:checked') || {}).value || "true",
    };

    if (!data.first_name || !data.role) {
      showError("Please give at least your first name and what you do.");
      return;
    }
    if (!data.about_self) {
      showError("Please tick the box confirming you're answering about yourself.");
      form.about_self.focus();
      return;
    }

    generate(data);
  });

  function generate(data) {
    setBusy(true);
    fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { ok: false, error: "Something went wrong. Please try again." };
        });
      })
      .then(function (out) {
        setBusy(false);
        if (!out || out.ok !== true) {
          showError((out && out.error) || "Couldn't generate a story. Please try again.");
          return;
        }
        render(out);
      })
      .catch(function () {
        setBusy(false);
        showError("Couldn't reach the server. Check your connection and try again.");
      });
  }

  function render(out) {
    elDate.textContent = todayLong();
    elHeadline.textContent = out.headline;
    elSubhead.textContent = out.subhead;

    elBody.innerHTML = "";
    (out.paragraphs || []).forEach(function (p) {
      var para = document.createElement("p");
      para.textContent = p;
      elBody.appendChild(para);
    });

    elFooter.textContent =
      "Generated at " + CAMPAIGN_URL + " — no watchdog would make them correct this.";

    setupShare(out.headline);

    // "How they did it" — map the model's tagged techniques to friendly labels.
    howList.innerHTML = "";
    var techs = out.techniques_used || [];
    if (techs.length === 0) {
      var li = document.createElement("li");
      li.textContent = "The classic tabloid moves — insinuation, anonymous sources and loaded questions.";
      howList.appendChild(li);
    } else {
      techs.forEach(function (t) {
        var li = document.createElement("li");

        var label = document.createElement("span");
        label.className = "tech-label";
        label.textContent = TECH_NAMES[t.label] || t.label || "Technique";
        li.appendChild(label);

        if (t.quote) {
          var q = document.createElement("div");
          q.className = "tech-quote";
          q.textContent = "“" + t.quote + "”";
          li.appendChild(q);
        }
        if (t.note) {
          var n = document.createElement("div");
          n.className = "tech-note";
          n.textContent = t.note;
          li.appendChild(n);
        }
        howList.appendChild(li);
      });
    }
    howDetails.open = false;

    resultSection.hidden = false;
    resultH.setAttribute("tabindex", "-1");
    resultH.focus();
    resultH.scrollIntoView({ behavior: "smooth", block: "start" });
    refreshCounter();
  }

  // --- Share the (absurd) headline ---
  // The headline is the hook, so it leads every share. currentShareText/Url are
  // rebuilt per result and reused by every button (native, X, FB, WhatsApp, copy).
  var currentShareText = "";
  var currentShareUrl = "";

  function setupShare(headline) {
    currentShareUrl = location.origin + location.pathname;
    currentShareText =
      "“" + headline + "” — I turned my boring week into a tabloid front page. Make yours:";

    var encText = encodeURIComponent(currentShareText);
    var encUrl = encodeURIComponent(currentShareUrl);
    var textPlusUrl = encodeURIComponent(currentShareText + " " + currentShareUrl);

    shareX.href = "https://twitter.com/intent/tweet?text=" + encText + "&url=" + encUrl;
    shareFb.href = "https://www.facebook.com/sharer/sharer.php?u=" + encUrl + "&quote=" + encText;
    shareWa.href = "https://wa.me/?text=" + textPlusUrl;

    // Native share sheet (mobile) — best experience where available.
    if (navigator.share) {
      shareNativeBtn.hidden = false;
    } else {
      shareNativeBtn.hidden = true;
    }
    shareStatus.textContent = "";
  }

  shareNativeBtn.addEventListener("click", function () {
    if (!navigator.share) return;
    navigator
      .share({ title: "Make Me Tomorrow's Front Page", text: currentShareText, url: currentShareUrl })
      .catch(function () {
        /* user dismissed — no-op */
      });
  });

  shareCopyBtn.addEventListener("click", function () {
    var payload = currentShareText + " " + currentShareUrl;
    function done() {
      shareStatus.textContent = "Copied! Paste it anywhere.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(done, fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      try {
        var ta = document.createElement("textarea");
        ta.value = payload;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch (e) {
        shareStatus.textContent = "Couldn't copy — select the headline manually.";
      }
    }
  });

  // --- Download the card as a PNG via html2canvas ---
  downloadBtn.addEventListener("click", function () {
    if (typeof window.html2canvas !== "function") {
      statusEl.textContent = "Image download isn't available in this browser.";
      return;
    }
    var prev = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Rendering…";

    window
      .html2canvas(paper, {
        scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      .then(function (canvas) {
        var link = document.createElement("a");
        link.download = "daily-telegram-front-page.png";
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(function () {
        statusEl.textContent = "Couldn't render the image. Try a screenshot instead.";
      })
      .finally(function () {
        downloadBtn.disabled = false;
        downloadBtn.textContent = prev;
      });
  });

  againBtn.addEventListener("click", function () {
    resultSection.hidden = true;
    clearError();
    statusEl.textContent = "";
    form.reset();
    document.getElementById("first_name").focus();
    document.getElementById("make").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // --- Simple counter ---
  function refreshCounter() {
    fetch("/api/counter")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && typeof d.total === "number") {
          var el = document.getElementById("counter");
          el.textContent =
            d.total.toLocaleString("en-AU") + " front pages printed and counting.";
        }
      })
      .catch(function () {
        /* counter is optional */
      });
  }

  refreshCounter();
})();

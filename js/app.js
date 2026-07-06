// Make Me Tomorrow's Front Page — front-end logic.
// Talks to /api/generate (Pages Function). No secrets here; the API key lives
// only on the server.

(function () {
  "use strict";

  // Where the campaign lives. Change these two for your deployment.
  // CAMPAIGN_URL is the *display* domain printed on the card; actual share
  // links are built from location.origin so previews keep working too.
  var CAMPAIGN_URL = "makemethefrontpage.site";
  var PETITION_URL =
    "https://www.getup.org.au/campaigns/media-reform-2026/press-council/time-to-fix-australia-s-broken-media";
  var UTM_CAMPAIGN = "media-reform";

  function withUtm(url, medium) {
    return (
      url +
      (url.indexOf("?") === -1 ? "?" : "&") +
      "utm_source=frontpage&utm_medium=" +
      encodeURIComponent(medium) +
      "&utm_campaign=" +
      UTM_CAMPAIGN
    );
  }

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

  Array.prototype.forEach.call(
    document.querySelectorAll(".petition-link"),
    function (a) {
      a.setAttribute("href", withUtm(PETITION_URL, "site"));
    }
  );

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

  // Satirical loading lines keep people entertained while the model writes.
  var LOADING_LINES = [
    "Writing your front page — this takes a few seconds…",
    "Ringing unnamed sources…",
    "Locating a friend who is “not surprised”…",
    "Framing an accusation as an innocent question…",
    "Doctoring the photo…",
    "Running it past the lawyers (they've gone to lunch)…",
    "Hold the front page…",
  ];
  var loadingTimer = null;

  function setBusy(busy) {
    generateBtn.disabled = busy;
    generateBtn.textContent = busy ? "Going to press…" : "Print my front page";
    if (loadingTimer) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
    if (busy) {
      var i = 0;
      statusEl.textContent = LOADING_LINES[0];
      loadingTimer = setInterval(function () {
        i = (i + 1) % LOADING_LINES.length;
        statusEl.textContent = LOADING_LINES[i];
      }, 2500);
    } else {
      statusEl.textContent = "";
    }
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

    setupShare(out.headline, out.id);

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
    // Open by default — the technique annotations are the point of the exercise.
    howDetails.open = true;

    resultSection.hidden = false;
    resultH.setAttribute("tabindex", "-1");
    resultH.focus();
    resultH.scrollIntoView({ behavior: "smooth", block: "start" });
    refreshCounter();
  }

  // --- Share the (absurd) headline ---
  // The headline is the hook, so it leads every share. When the server returns
  // a permalink id, shares point at /p/<id> so recipients land on the actual
  // front page (with its own social preview); otherwise fall back to the home
  // page. Each channel gets its own utm_medium for attribution.
  var currentShareText = "";
  var currentShareBase = "";

  function shareUrlFor(medium) {
    return withUtm(currentShareBase, medium);
  }

  function setupShare(headline, id) {
    currentShareBase = id
      ? location.origin + "/p/" + encodeURIComponent(id)
      : location.origin + location.pathname;
    currentShareText =
      "“" + headline + "” — I turned my boring week into a tabloid front page. Make yours:";

    var encText = encodeURIComponent(currentShareText);

    shareX.href =
      "https://twitter.com/intent/tweet?text=" + encText +
      "&url=" + encodeURIComponent(shareUrlFor("x"));
    shareFb.href =
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(shareUrlFor("fb")) + "&quote=" + encText;
    shareWa.href =
      "https://wa.me/?text=" +
      encodeURIComponent(currentShareText + " " + shareUrlFor("wa"));

    // Native share sheet (mobile) — best experience where available.
    if (navigator.share) {
      shareNativeBtn.hidden = false;
    } else {
      shareNativeBtn.hidden = true;
    }
    shareStatus.textContent = "";
  }

  // Native share: include the rendered front page as an image where the
  // platform supports sharing files — the picture is the hook. Fall back to
  // text + URL if rendering fails or files can't be shared.
  shareNativeBtn.addEventListener("click", function () {
    if (!navigator.share) return;
    var payload = {
      title: "Make Me Tomorrow's Front Page",
      text: currentShareText,
      url: shareUrlFor("native"),
    };
    function shareTextOnly() {
      navigator.share(payload).catch(function () {
        /* user dismissed — no-op */
      });
    }
    if (typeof window.html2canvas !== "function" || !navigator.canShare) {
      shareTextOnly();
      return;
    }
    window
      .html2canvas(paper, {
        scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      .then(function (canvas) {
        return new Promise(function (resolve) {
          canvas.toBlob(resolve, "image/png");
        });
      })
      .then(function (blob) {
        if (!blob) {
          shareTextOnly();
          return;
        }
        var file = new File([blob], "daily-telegram-front-page.png", { type: "image/png" });
        var withFile = {
          title: payload.title,
          text: payload.text,
          url: payload.url,
          files: [file],
        };
        if (navigator.canShare(withFile)) {
          navigator.share(withFile).catch(function () {
            /* user dismissed — no-op */
          });
        } else {
          shareTextOnly();
        }
      })
      .catch(shareTextOnly);
  });

  shareCopyBtn.addEventListener("click", function () {
    var payload = currentShareText + " " + shareUrlFor("copy");
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
          var text = d.total.toLocaleString("en-AU") + " front pages printed and counting.";
          Array.prototype.forEach.call(
            document.querySelectorAll("[data-counter]"),
            function (el) {
              el.textContent = text;
              el.hidden = false;
            }
          );
        }
      })
      .catch(function () {
        /* counter is optional */
      });
  }

  refreshCounter();
})();

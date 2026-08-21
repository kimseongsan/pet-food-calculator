/* ==========================================================================
   반려동물 사료량 계산기 - 사료 소진일 계산 + 캘린더 연동
   window.PetCalcCalendar.setDailyGram(g) 로 1일 급여량을 전달받는다.
   ========================================================================== */

(function () {
  "use strict";

  var dailyGram = null;

  function $(id) {
    return document.getElementById(id);
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function formatDateKorean(date) {
    return date.getFullYear() + "년 " + (date.getMonth() + 1) + "월 " + date.getDate() + "일";
  }

  function formatDateICS(date) {
    return "" + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
  }

  function formatDateForGoogle(date) {
    // 하루 종일 이벤트: 시작일 = 소진예상일, 종료일 = 다음날 (Google Calendar 규칙)
    var end = new Date(date.getTime());
    end.setDate(end.getDate() + 1);
    return formatDateICS(date) + "/" + formatDateICS(end);
  }

  function getTotalGramInput() {
    var amount = parseFloat($("food-total-amount").value);
    var unit = $("food-total-unit").value;
    if (!amount || amount <= 0) return null;
    return unit === "kg" ? amount * 1000 : amount;
  }

  function computeDepletionDate(totalGram, dailyGramValue) {
    if (!totalGram || !dailyGramValue || dailyGramValue <= 0) return null;
    var days = Math.floor(totalGram / dailyGramValue);
    var date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return { days: days, date: date };
  }

  function updateDepletionUI() {
    var resultEl = $("depletion-result");
    var actionsEl = $("depletion-actions");
    var totalGram = getTotalGramInput();

    if (!dailyGram) {
      resultEl.textContent = "먼저 상세모드에서 100g당 칼로리를 입력해 급여량을 계산해주세요.";
      actionsEl.classList.add("hidden");
      return;
    }

    if (!totalGram) {
      resultEl.textContent = "사료 총량을 입력하면 소진 예상일을 계산해드려요.";
      actionsEl.classList.add("hidden");
      return;
    }

    var result = computeDepletionDate(totalGram, dailyGram);
    if (!result) {
      resultEl.textContent = "사료 총량을 입력하면 소진 예상일을 계산해드려요.";
      actionsEl.classList.add("hidden");
      return;
    }

    resultEl.innerHTML =
      "이대로 급여하면 약 <strong>" + result.days + "일</strong> 후인 " +
      "<strong>" + formatDateKorean(result.date) + "</strong>쯤 사료가 떨어질 것으로 예상돼요.";
    actionsEl.classList.remove("hidden");
    actionsEl.dataset.depletionDate = result.date.toISOString();
  }

  function generateICS(date) {
    var dtStamp = formatDateICS(new Date()) + "T000000Z";
    var dtStart = formatDateICS(date);
    var endDate = new Date(date.getTime());
    endDate.setDate(endDate.getDate() + 1);
    var dtEnd = formatDateICS(endDate);
    var uid = "petcalc-" + Date.now() + "@pet-food-calculator";

    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//반려동물 사료량 계산기//KO",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + dtStamp,
      "DTSTART;VALUE=DATE:" + dtStart,
      "DTEND;VALUE=DATE:" + dtEnd,
      "SUMMARY:🐾 사료 다 떨어질 시기 — 미리 주문하세요",
      "DESCRIPTION:반려동물 사료량 계산기에서 계산한 예상 소진일입니다. 미리 사료를 주문해보세요.",
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    return lines.join("\r\n");
  }

  function downloadICS(date) {
    var content = generateICS(date);
    var blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "사료_소진_예정일.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function buildGoogleCalendarURL(date) {
    var params = new URLSearchParams({
      action: "TEMPLATE",
      text: "🐾 사료 다 떨어질 시기 — 미리 주문하세요",
      dates: formatDateForGoogle(date),
      details: "반려동물 사료량 계산기에서 계산한 예상 소진일입니다. 미리 사료를 주문해보세요."
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var amountInput = $("food-total-amount");
    var unitSelect = $("food-total-unit");
    if (amountInput) amountInput.addEventListener("input", updateDepletionUI);
    if (unitSelect) unitSelect.addEventListener("change", updateDepletionUI);

    var icsBtn = $("ics-download");
    if (icsBtn) {
      icsBtn.addEventListener("click", function () {
        var actionsEl = $("depletion-actions");
        var iso = actionsEl.dataset.depletionDate;
        if (!iso) return;
        downloadICS(new Date(iso));
      });
    }

    var gcalBtn = $("google-calendar-add");
    if (gcalBtn) {
      gcalBtn.addEventListener("click", function () {
        var actionsEl = $("depletion-actions");
        var iso = actionsEl.dataset.depletionDate;
        if (!iso) return;
        window.open(buildGoogleCalendarURL(new Date(iso)), "_blank", "noopener");
      });
    }
  });

  window.PetCalcCalendar = {
    setDailyGram: function (g) {
      dailyGram = g;
      updateDepletionUI();
    }
  };
})();

/* ==========================================================================
   반려동물 사료량 계산기 - 급여량 시각화 (SVG)
   - 건식: 종이컵 실루엣, 자연스러운 그라데이션으로 채워지는 사료량 표현
   - 습식: 스테인리스 숟가락 실루엣
   window.PetCalcVisual.render({foodType, dailyGram, cupWeight}) 호출로 그려진다.
   ========================================================================== */

(function () {
  "use strict";

  var TABLESPOON_ML = 15; // 큰술 1스푼 = 15ml, 물과 밀도가 비슷하다고 가정해 g ≈ ml로 취급

  function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
  }

  /**
   * value를 denom 분모의 분수로 반올림해 {whole, num, den} 형태로 반환한다.
   */
  function toFraction(value, denom) {
    var totalUnits = Math.round(value * denom);
    if (totalUnits < 0) totalUnits = 0;
    var whole = Math.floor(totalUnits / denom);
    var rem = totalUnits % denom;
    var num = rem;
    var den = denom;
    if (num > 0) {
      var g = gcd(num, den);
      num = num / g;
      den = den / g;
    }
    return { whole: whole, num: num, den: den };
  }

  function formatMixedFraction(value, denom, unitLabel) {
    var f = toFraction(value, denom);
    if (f.whole === 0 && f.num === 0) return "0" + unitLabel;
    if (f.num === 0) return f.whole + unitLabel;
    if (f.whole === 0) return f.num + "/" + f.den + unitLabel;
    return f.whole + "과 " + f.num + "/" + f.den + unitLabel;
  }

  /* ------------------------------------------------------------------
     종이컵 SVG — 트레이싱한 컵 실루엣 + 사료 질감을 흉내낸 그라데이션 채움
     ------------------------------------------------------------------ */
  function buildCupSVG(ratio) {
    var clampedRatio = Math.max(0, Math.min(1, ratio));
    var top = 18, bottom = 148;
    var fillTopY = bottom - clampedRatio * (bottom - top);
    var hasFill = clampedRatio > 0.02;

    var svg =
      '<svg viewBox="0 0 120 165" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사료 채움 정도를 보여주는 컵 그림">' +
      "<defs>" +
      '<linearGradient id="kibbleFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#f0c078"/>' +
      '<stop offset="55%" stop-color="#d99a4e"/>' +
      '<stop offset="100%" stop-color="#c07f38"/>' +
      "</linearGradient>" +
      '<linearGradient id="cupBody" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#ffffff"/>' +
      '<stop offset="100%" stop-color="#f6f3ee"/>' +
      "</linearGradient>" +
      '<clipPath id="cupClip"><path d="M12,18 L108,18 L90,148 L30,148 Z"/></clipPath>' +
      "</defs>" +
      '<path d="M12,18 L108,18 L90,148 L30,148 Z" fill="url(#cupBody)" stroke="#d8cdbb" stroke-width="2.5"/>' +
      '<g clip-path="url(#cupClip)">';

    if (hasFill) {
      svg +=
        '<rect x="0" y="' + fillTopY + '" width="120" height="' + (bottom - fillTopY) + '" fill="url(#kibbleFill)"/>' +
        '<ellipse cx="60" cy="' + fillTopY + '" rx="34" ry="5" fill="#f7d59a" opacity="0.75"/>';
    }

    svg +=
      "</g>" +
      '<path d="M12,18 L108,18 L90,148 L30,148 Z" fill="none" stroke="#d8cdbb" stroke-width="2.5"/>' +
      '<ellipse cx="60" cy="18" rx="48" ry="7" fill="#ffffff" stroke="#d8cdbb" stroke-width="2.5"/>' +
      "</svg>";
    return svg;
  }

  /* ------------------------------------------------------------------
     숟가락 SVG — 스테인리스 질감 그라데이션 + 사료(습식) 채움
     ------------------------------------------------------------------ */
  function buildSpoonSVG(ratio) {
    var clampedRatio = Math.max(0, Math.min(1, ratio));
    var cx = 55, cy = 52, rx = 46, ry = 33;
    var bowlTop = cy - ry, bowlBottom = cy + ry;
    var fillTopY = bowlBottom - clampedRatio * (bowlBottom - bowlTop);
    var hasFill = clampedRatio > 0.02;

    var svg =
      '<svg viewBox="0 0 175 105" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="사료 채움 정도를 보여주는 숟가락 그림">' +
      "<defs>" +
      '<linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fbfbfc"/>' +
      '<stop offset="45%" stop-color="#e3e6ea"/>' +
      '<stop offset="100%" stop-color="#c7ccd3"/>' +
      "</linearGradient>" +
      '<linearGradient id="wetFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#e8a06a"/>' +
      '<stop offset="60%" stop-color="#c67a45"/>' +
      '<stop offset="100%" stop-color="#a8632f"/>' +
      "</linearGradient>" +
      '<clipPath id="spoonClip"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/></clipPath>' +
      "</defs>" +
      '<rect x="98" y="46" width="72" height="13" rx="6.5" fill="url(#steel)" stroke="#c7ccd3" stroke-width="1.5"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#steel)" stroke="#c7ccd3" stroke-width="1.5"/>' +
      '<g clip-path="url(#spoonClip)">';

    if (hasFill) {
      svg +=
        '<rect x="0" y="' + fillTopY + '" width="115" height="' + (bowlBottom - fillTopY) + '" fill="url(#wetFill)"/>' +
        '<ellipse cx="' + cx + '" cy="' + fillTopY + '" rx="28" ry="4.5" fill="#f0b98a" opacity="0.7"/>';
    }

    svg +=
      "</g>" +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#c7ccd3" stroke-width="1.5"/>' +
      "</svg>";
    return svg;
  }

  function render(opts) {
    var container = document.getElementById("visual-svg-wrap");
    var captionMainEl = document.getElementById("visual-caption-main");
    var captionSubEl = document.getElementById("visual-caption-sub");
    if (!container) return;

    var gramLabel = Math.round(opts.dailyGram) + "g";

    if (opts.foodType === "dry") {
      var cupWeight = opts.cupWeight && opts.cupWeight > 0 ? opts.cupWeight : 90;
      var cups = opts.dailyGram / cupWeight;
      var ratio = cups > 1 ? 1 : cups;
      container.innerHTML = buildCupSVG(ratio);
      var cupLabel = formatMixedFraction(cups, 4, "컵");
      captionMainEl.textContent = "하루 " + gramLabel + " (컵으로는 약 " + cupLabel + ") 정도 주시면 돼요";
      captionSubEl.textContent = "알갱이 크기·브랜드에 따라 다를 수 있어요. 정확한 계량은 저울을 추천해요.";
    } else {
      var tbsp = opts.dailyGram / TABLESPOON_ML;
      var ratio2 = tbsp > 1 ? 1 : tbsp;
      container.innerHTML = buildSpoonSVG(ratio2);
      var tbspLabel = formatMixedFraction(tbsp, 2, "큰술");
      captionMainEl.textContent = "하루 " + gramLabel + " (큰술로는 약 " + tbspLabel + ") 정도 주시면 돼요";
      captionSubEl.textContent = "실제 질감·양은 사료 브랜드에 따라 다를 수 있어요. 참고용 예시예요.";
    }

    document.getElementById("visual-wrap").classList.remove("hidden");
  }

  function onFoodTypeChange() {
    // 사료 종류가 바뀌면 상세 계산을 다시 실행해야 시각화가 갱신되므로 여기서는 별도 처리하지 않는다.
    // (calculator.js의 폼 재제출 시 render()가 다시 호출됨)
  }

  window.PetCalcVisual = {
    render: render,
    onFoodTypeChange: onFoodTypeChange
  };
})();

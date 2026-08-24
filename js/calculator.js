/* ==========================================================================
   반려동물 사료량 계산기 - 핵심 계산 로직
   - RER(안정시 에너지 요구량), DER(일일 에너지 요구량) 계산
   - 생애주기 자동 판정, 간편모드 ↔ 상세모드 상태 공유
   - 다른 모듈(visual.js, calendar.js, share.js)이 참조하는 전역 네임스페이스: window.PetCalc
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "petCalc.state.v1";

  /* ------------------------------------------------------------------
     생애주기 / 계수 테이블
     참고: WSAVA(세계소동물수의사회) Global Nutrition Guidelines,
           AAHA(미국동물병원협회) Nutrition and Weight Management Guidelines
     위 가이드라인이 제시하는 DER = RER × 계수 방식의 대표적인 근사치를 사용한다.
     실제 대사량은 품종·체형·건강상태에 따라 달라질 수 있으므로 참고용 수치이다.
     ------------------------------------------------------------------ */

  // 성견/성묘 이후 구간에서 활동량에 따라 곱해주는 보정치.
  // "보통" 활동량을 1.0으로 두고, WSAVA 가이드라인의 활동 수준별 범위를 근사했다.
  var ACTIVITY_MULTIPLIER = {
    low: 0.8, // 실내 위주, 활동량 적음 (체중 관리 필요한 경우 포함)
    normal: 1.0, // 하루 1~2회 일반적인 산책/놀이
    high: 1.2, // 활발함, 운동량 많음
    veryhigh: 1.4 // 작업견/스포츠견 등 매우 활동적인 경우
  };

  // 활동량 배수는 강아지·고양이가 동일하지만, 실제 생활 패턴이 달라 선택지 문구는 종별로 다르게 보여준다.
  var ACTIVITY_LABELS = {
    dog: {
      low: "낮음 (실내 위주, 산책 거의 없음)",
      normal: "보통 (하루 1~2회 산책)",
      high: "높음 (활발하게 뛰어놀거나 산책이 많음)",
      veryhigh: "매우 높음 (작업견·사역견 등)"
    },
    cat: {
      low: "낮음 (거의 움직이지 않는 실내 생활)",
      normal: "보통 (평범한 실내 생활, 놀이시간 있음)",
      high: "높음 (자유롭게 뛰어놀거나 외출이 잦음)",
      veryhigh: "매우 높음 (매우 활동적이거나 외출이 자유로움)"
    }
  };

  // 미중성화(intact) 동물은 중성화 동물보다 대사 요구량이 높다.
  // WSAVA 가이드라인 기준 성견 미중성화 1.8 / 중성화 1.6 → 비율 1.125를 그대로 노령 구간에도 적용.
  var NEUTER_MULTIPLIER = {
    neutered: 1.0,
    intact: 1.125
  };

  function computeRER(weightKg) {
    // RER(kcal/day) = 70 × (체중kg)^0.75  — 가장 널리 쓰이는 지수식(WSAVA 권장)
    return 70 * Math.pow(weightKg, 0.75);
  }

  /**
   * 생애주기를 자동 판정한다.
   * @param {"dog"|"cat"} species
   * @param {number} totalMonths 총 개월수
   * @param {"none"|"pregnant"|"lactating"} reproStatus 임신/수유 상태 (상세모드 전용)
   */
  function getLifeStage(species, totalMonths, reproStatus) {
    if (reproStatus === "pregnant") {
      return { key: "pregnant", label: "임신 중", coefBase: 1.8, fixed: true };
    }
    if (reproStatus === "lactating") {
      return {
        key: "lactating",
        label: "수유 중",
        coefBase: 3.0, // 새끼 마리 수에 따라 최대 6~8배까지 필요할 수 있음(가이드라인 참고, 결과에 안내 문구 표시)
        fixed: true
      };
    }

    if (species === "dog") {
      if (totalMonths < 4) return { key: "puppy1", label: "자견(급성장기)", coefBase: 3.0, fixed: true };
      if (totalMonths < 12) return { key: "puppy2", label: "자견(성장기 후반)", coefBase: 2.0, fixed: true };
      if (totalMonths < 84) return { key: "adult", label: "성견", coefBase: 1.6, fixed: false };
      return { key: "senior", label: "노령견", coefBase: 1.4, fixed: false };
    }

    // cat
    if (totalMonths < 4) return { key: "kitten1", label: "자묘(급성장기)", coefBase: 3.0, fixed: true };
    if (totalMonths < 12) return { key: "kitten2", label: "자묘(성장기 후반)", coefBase: 2.0, fixed: true };
    if (totalMonths < 120) return { key: "adult", label: "성묘", coefBase: 1.6, fixed: false };
    return { key: "senior", label: "노령묘", coefBase: 1.4, fixed: false };
  }

  /**
   * DER(일일 에너지 요구량, kcal)을 계산한다.
   * @param {object} params
   * @param {"dog"|"cat"} params.species
   * @param {number} params.weightKg
   * @param {number} params.totalMonths
   * @param {"low"|"normal"|"high"|"veryhigh"} [params.activity]
   * @param {"neutered"|"intact"} [params.neuter]
   * @param {"none"|"pregnant"|"lactating"} [params.repro]
   */
  function computeDER(params) {
    var species = params.species;
    var weightKg = params.weightKg;
    var totalMonths = params.totalMonths;
    var activity = params.activity || "normal";
    var neuter = params.neuter || "neutered";
    var repro = params.repro || "none";

    var rer = computeRER(weightKg);
    var stage = getLifeStage(species, totalMonths, repro);

    var coef = stage.coefBase;
    if (!stage.fixed) {
      coef = stage.coefBase * NEUTER_MULTIPLIER[neuter] * ACTIVITY_MULTIPLIER[activity];
    }

    var der = rer * coef;
    return {
      rer: rer,
      der: der,
      coef: coef,
      stage: stage
    };
  }

  // 간편모드: 일반 건식 사료 평균 칼로리(100g당 kcal) 가정치
  var AVERAGE_DRY_KCAL_PER_100G = 350;

  function estimateGramsFromKcalPer100g(der, kcalPer100g) {
    if (!kcalPer100g || kcalPer100g <= 0) return null;
    return (der / kcalPer100g) * 100;
  }

  function totalMonthsFrom(years, months) {
    return (Number(years) || 0) * 12 + (Number(months) || 0);
  }

  function roundKcal(v) {
    return Math.round(v);
  }

  function roundGram(v) {
    return Math.round(v);
  }

  /* ------------------------------------------------------------------
     상태 저장/복원 (localStorage) — 다른 모듈이 공유하는 단일 상태 객체
     ------------------------------------------------------------------ */

  var defaultState = {
    species: "dog",
    weight: null,
    ageYears: null,
    ageMonths: 0,
    activity: "normal",
    neuter: "neutered",
    repro: "none",
    foodType: "dry",
    packKcal: null,
    packWeight: null,
    kcal100: null,
    cupWeight: null,
    cupWeightInput: null,
    cupWeightUnit: "g",
    foodTotalAmount: null,
    foodTotalUnit: "g",
    mode: "simple"
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaultState);
      var parsed = JSON.parse(raw);
      return Object.assign({}, defaultState, parsed);
    } catch (e) {
      return Object.assign({}, defaultState);
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage 사용 불가 환경은 조용히 무시 */
    }
  }

  var state = loadState();

  /* ------------------------------------------------------------------
     DOM 헬퍼
     ------------------------------------------------------------------ */

  function $(id) {
    return document.getElementById(id);
  }

  function setChipPressed(groupSelector, value, datasetKey) {
    var chips = document.querySelectorAll(groupSelector);
    chips.forEach(function (chip) {
      var pressed = chip.dataset[datasetKey] === value;
      chip.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("show");
  }

  /* ------------------------------------------------------------------
     간편모드 로직
     ------------------------------------------------------------------ */

  function initSimpleMode() {
    var speciesChips = document.querySelectorAll("[data-species-simple]");
    speciesChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.species = chip.dataset.speciesSimple;
        setChipPressed("[data-species-simple]", state.species, "speciesSimple");
      });
    });
    setChipPressed("[data-species-simple]", state.species, "speciesSimple");

    if (state.weight) $("simple-weight").value = state.weight;
    if (state.ageYears !== null && state.ageYears !== undefined) {
      $("simple-age-years").value = state.ageYears;
    }
    $("simple-age-months").value = state.ageMonths;

    var form = $("simple-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runSimpleCalculation();
    });

    $("goto-detail-preg").addEventListener("click", function (e) {
      e.preventDefault();
      state.repro = "pregnant";
      switchToDetailMode();
    });

    // 재방문 시 이미 체중·나이가 저장되어 있으면 자동으로 계산 결과까지 복원
    if (state.weight && state.ageYears !== null && state.mode === "simple") {
      runSimpleCalculation(true);
    }
  }

  function runSimpleCalculation(silent) {
    var weightInput = $("simple-weight");
    var errorEl = $("simple-weight-error");
    var weight = parseFloat(weightInput.value);

    if (!weight || weight <= 0) {
      showError(errorEl, "체중을 0보다 큰 숫자로 입력해주세요.");
      $("simple-result").classList.add("hidden");
      return;
    }
    clearError(errorEl);

    var ageYearsRaw = $("simple-age-years").value;
    var ageErrorEl = $("simple-age-error");
    if (ageYearsRaw === "") {
      showError(ageErrorEl, "나이(년)를 선택해주세요.");
      $("simple-result").classList.add("hidden");
      return;
    }
    clearError(ageErrorEl);

    state.weight = weight;
    state.ageYears = parseInt(ageYearsRaw, 10) || 0;
    state.ageMonths = parseInt($("simple-age-months").value, 10) || 0;
    state.activity = "normal";
    state.neuter = "neutered";
    state.repro = "none";
    saveState(state);

    var totalMonths = totalMonthsFrom(state.ageYears, state.ageMonths);
    var result = computeDER({
      species: state.species,
      weightKg: weight,
      totalMonths: totalMonths,
      activity: "normal",
      neuter: "neutered",
      repro: "none"
    });

    var der = roundKcal(result.der);
    var grams = roundGram(estimateGramsFromKcalPer100g(result.der, AVERAGE_DRY_KCAL_PER_100G));
    var speciesLabel = state.species === "dog" ? "강아지" : "고양이";
    var ageLabel = state.ageYears > 0 ? state.ageYears + "살" : state.ageMonths + "개월";

    $("simple-result-text").textContent =
      weight + "kg / " + ageLabel + " " + speciesLabel + "는 하루 약 " + der + "kcal이 필요해요.";
    $("simple-der-value").textContent = der.toLocaleString("ko-KR") + " kcal";
    $("simple-gram-estimate").textContent =
      "일반 건식 사료(100g당 약 " + AVERAGE_DRY_KCAL_PER_100G + "kcal) 기준으로는 약 " + grams + "g 정도예요.";

    var cupEstimateEl = $("simple-cup-estimate");
    if (cupEstimateEl) {
      var cupText = window.PetCalcVisual ? window.PetCalcVisual.estimateCupText(grams) : null;
      cupEstimateEl.textContent = cupText
        ? "집에 있는 일반 종이컵(180ml)으로는 약 " + cupText + " 정도예요."
        : "";
    }

    $("simple-lifestage-label").textContent = result.stage.label;

    $("simple-result").classList.remove("hidden");

    if (!silent) {
      $("simple-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ------------------------------------------------------------------
     상세모드 로직
     ------------------------------------------------------------------ */

  function initDetailMode() {
    var speciesChips = document.querySelectorAll("[data-species-detail]");
    speciesChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.species = chip.dataset.speciesDetail;
        setChipPressed("[data-species-detail]", state.species, "speciesDetail");
        updateActivityOptions(state.species);
        updateLifeStageBadge();
      });
    });

    var foodTypeChips = document.querySelectorAll("[data-foodtype]");
    foodTypeChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.foodType = chip.dataset.foodtype;
        setChipPressed("[data-foodtype]", state.foodType, "foodtype");
        toggleCupWeightField();
        if (window.PetCalcVisual) window.PetCalcVisual.onFoodTypeChange(state.foodType);
      });
    });

    ["detail-weight", "detail-age-years", "detail-age-months"].forEach(function (id) {
      $(id).addEventListener("input", updateLifeStageBadge);
      $(id).addEventListener("change", updateLifeStageBadge);
    });

    $("detail-repro").addEventListener("change", function () {
      state.repro = $("detail-repro").value;
      updateLifeStageBadge();
    });

    $("back-to-simple").addEventListener("click", function () {
      switchToSimpleMode();
    });

    $("goto-detail").addEventListener("click", function () {
      switchToDetailMode();
    });

    var searchBtn = $("simple-search-food");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        // TODO: 사료 데이터베이스 검색 연동 (3차 스테이지 9단계에서 실제 검색으로 교체 예정)
        // 검색 기능이 준비되기 전까지는 상세모드의 수동 칼로리 입력으로 안내한다.
        switchToDetailMode();
        var input = $("detail-pack-kcal");
        if (input) {
          input.focus();
        }
      });
    }

    var form = $("detail-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runDetailCalculation();
    });

    toggleCupWeightField();
    restoreDetailFormFromState();
    updateLifeStageBadge();
  }

  function restoreDetailFormFromState() {
    setChipPressed("[data-species-detail]", state.species, "speciesDetail");
    setChipPressed("[data-foodtype]", state.foodType, "foodtype");
    if (state.weight) $("detail-weight").value = state.weight;
    if (state.ageYears !== null && state.ageYears !== undefined) {
      $("detail-age-years").value = state.ageYears;
    }
    $("detail-age-months").value = state.ageMonths;
    updateActivityOptions(state.species);
    $("detail-activity").value = state.activity;
    $("detail-neuter").value = state.neuter;
    $("detail-repro").value = state.repro;
    if (state.packKcal) $("detail-pack-kcal").value = state.packKcal;
    if (state.packWeight) $("detail-pack-weight").value = state.packWeight;
    if (state.cupWeightInput) $("detail-cup-weight").value = state.cupWeightInput;
    $("detail-cup-weight-unit").value = state.cupWeightUnit;
  }

  function toggleCupWeightField() {
    var wrap = $("detail-cup-weight-group");
    if (!wrap) return;
    wrap.classList.toggle("hidden", state.foodType !== "dry");
  }

  function updateActivityOptions(species) {
    var select = $("detail-activity");
    if (!select) return;
    var labels = ACTIVITY_LABELS[species] || ACTIVITY_LABELS.dog;
    var previousValue = select.value;
    Array.prototype.forEach.call(select.options, function (option) {
      if (labels[option.value]) {
        option.textContent = labels[option.value];
      }
    });
    select.value = previousValue;
  }

  function updateLifeStageBadge() {
    var yearsRaw = $("detail-age-years").value;

    if (yearsRaw === "") {
      // 나이(년)를 아직 선택하지 않은 상태 — 생애주기를 섣불리 판정하지 않고 선택을 유도한다.
      $("detail-lifestage-badge").textContent = "-";
      var groups = [$("detail-activity-group"), $("detail-neuter-group")];
      groups.forEach(function (g) {
        if (!g) return;
        g.classList.add("is-disabled");
      });
      $("detail-activity").disabled = true;
      $("detail-neuter").disabled = true;
      $("detail-activity-note").textContent = "나이(년)를 선택하면 생애주기가 자동으로 판정돼요.";
      return;
    }

    var years = parseInt(yearsRaw, 10) || 0;
    var months = parseInt($("detail-age-months").value, 10) || 0;
    var totalMonths = totalMonthsFrom(years, months);
    var stage = getLifeStage(state.species, totalMonths, $("detail-repro").value);

    $("detail-lifestage-badge").textContent = stage.label;

    var activityGroup = $("detail-activity-group");
    var neuterGroup = $("detail-neuter-group");
    var disabled = stage.fixed;
    [activityGroup, neuterGroup].forEach(function (g) {
      if (!g) return;
      g.classList.toggle("is-disabled", disabled);
    });
    $("detail-activity").disabled = disabled;
    $("detail-neuter").disabled = disabled;

    if (disabled) {
      $("detail-activity-note").textContent =
        stage.key.indexOf("puppy") === 0 || stage.key.indexOf("kitten") === 0
          ? "성장기·임신·수유 중에는 활동량/중성화 여부가 계산에 반영되지 않아요."
          : "이 생애주기에서는 활동량/중성화 여부가 계산에 반영되지 않아요.";
    } else {
      $("detail-activity-note").textContent = "";
    }
  }

  function runDetailCalculation() {
    var weightInput = $("detail-weight");
    var errorEl = $("detail-weight-error");
    var weight = parseFloat(weightInput.value);

    if (!weight || weight <= 0) {
      showError(errorEl, "체중을 0보다 큰 숫자로 입력해주세요.");
      $("detail-result").classList.add("hidden");
      return;
    }
    clearError(errorEl);

    var ageYearsRaw = $("detail-age-years").value;
    var ageErrorEl = $("detail-age-error");
    if (ageYearsRaw === "") {
      showError(ageErrorEl, "나이(년)를 선택해주세요.");
      $("detail-result").classList.add("hidden");
      return;
    }
    clearError(ageErrorEl);

    state.weight = weight;
    state.ageYears = parseInt(ageYearsRaw, 10) || 0;
    state.ageMonths = parseInt($("detail-age-months").value, 10) || 0;
    state.activity = $("detail-activity").value;
    state.neuter = $("detail-neuter").value;
    state.repro = $("detail-repro").value;
    state.packKcal = parseFloat($("detail-pack-kcal").value) || null;
    state.packWeight = parseFloat($("detail-pack-weight").value) || null;
    // 포장지의 총 열량 ÷ 총 내용량 × 100 으로 100g당 칼로리를 역산한다.
    state.kcal100 =
      state.packKcal && state.packWeight && state.packWeight > 0
        ? (state.packKcal / state.packWeight) * 100
        : null;
    state.cupWeightInput = parseFloat($("detail-cup-weight").value) || null;
    state.cupWeightUnit = $("detail-cup-weight-unit").value;
    // kg으로 입력해도 상관없도록 g으로 환산해서 계산에 사용한다. 미입력 시 90g으로 추정.
    state.cupWeight = state.cupWeightInput
      ? state.cupWeightUnit === "kg"
        ? state.cupWeightInput * 1000
        : state.cupWeightInput
      : 90;
    state.mode = "detail";
    saveState(state);

    var totalMonths = totalMonthsFrom(state.ageYears, state.ageMonths);
    var result = computeDER({
      species: state.species,
      weightKg: weight,
      totalMonths: totalMonths,
      activity: state.activity,
      neuter: state.neuter,
      repro: state.repro
    });

    var der = result.der;
    var dailyGram = null;
    if (state.kcal100 && state.kcal100 > 0) {
      dailyGram = estimateGramsFromKcalPer100g(der, state.kcal100);
    }

    $("detail-der-value").textContent = roundKcal(der).toLocaleString("ko-KR") + " kcal";

    if (dailyGram) {
      $("detail-daily-gram").textContent = roundGram(dailyGram) + " g";
      $("detail-per-meal").textContent = roundGram(dailyGram / 2) + " g (하루 2회 기준)";
      $("detail-gram-block").classList.remove("hidden");
      $("detail-kcal100-missing").classList.add("hidden");

      if (window.PetCalcVisual) {
        window.PetCalcVisual.render({
          foodType: state.foodType,
          dailyGram: dailyGram,
          cupWeight: state.cupWeight
        });
      }
      if (window.PetCalcCalendar) {
        window.PetCalcCalendar.setDailyGram(dailyGram);
      }
    } else {
      $("detail-gram-block").classList.add("hidden");
      $("detail-kcal100-missing").classList.remove("hidden");
      if (window.PetCalcCalendar) {
        window.PetCalcCalendar.setDailyGram(null);
      }
    }

    $("detail-lifestage-badge-result").textContent = result.stage.label;
    $("detail-result").classList.remove("hidden");
    $("detail-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ------------------------------------------------------------------
     모드 전환
     ------------------------------------------------------------------ */

  function switchToDetailMode() {
    state.mode = "detail";
    saveState(state);
    $("simple-mode").classList.add("hidden");
    $("detail-mode").classList.remove("hidden");
    restoreDetailFormFromState();
    updateLifeStageBadge();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function switchToSimpleMode() {
    state.mode = "simple";
    saveState(state);
    $("detail-mode").classList.add("hidden");
    $("simple-mode").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ------------------------------------------------------------------
     초기화
     ------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    initSimpleMode();
    initDetailMode();

    // 재방문 시 마지막으로 보고 있던 모드가 상세모드였다면 그 화면으로 복원한다.
    // (간편모드였던 경우는 initSimpleMode 내부에서 이미 복원됨)
    if (state.mode === "detail" && state.weight && state.ageYears !== null) {
      switchToDetailMode();
      runDetailCalculation();
    }

    // URL 쿼리 파라미터로 공유된 결과가 있으면 share.js가 이 시점 이후 state를 다시 채우고
    // PetCalc.applyState()를 호출해 화면을 덮어써서 복원한다.
    window.dispatchEvent(new CustomEvent("petcalc:ready"));
  });

  /* ------------------------------------------------------------------
     외부(share.js, calendar.js, visual.js)에 공개하는 API
     ------------------------------------------------------------------ */

  window.PetCalc = {
    getState: function () {
      return Object.assign({}, state);
    },
    applyState: function (partial) {
      Object.assign(state, partial);
      saveState(state);
      if (state.mode === "detail") {
        switchToDetailMode();
        // 값 채운 뒤 detail 폼 제출 트리거
        if (state.weight) {
          $("detail-weight").value = state.weight;
        }
        restoreDetailFormFromState();
        updateLifeStageBadge();
        if (state.weight && state.ageYears !== null) {
          runDetailCalculation();
        }
      } else {
        if (state.weight) {
          $("simple-weight").value = state.weight;
        }
        if (state.ageYears !== null && state.ageYears !== undefined) {
          $("simple-age-years").value = state.ageYears;
        }
        $("simple-age-months").value = state.ageMonths;
        setChipPressed("[data-species-simple]", state.species, "speciesSimple");
        if (state.weight && state.ageYears !== null) {
          runSimpleCalculation(true);
        }
      }
    },
    computeDER: computeDER,
    computeRER: computeRER,
    getLifeStage: getLifeStage,
    totalMonthsFrom: totalMonthsFrom
  };
})();

export async function initBorderBuilder(setSnippet, isDarkMode = false) {
  const imageInput = document.getElementById("imageInput");
  const previewImage = document.getElementById("previewImage");
  const previewBg = document.getElementById("previewBg");
  const modeButtons = document.querySelectorAll("button[data-mode]");
  const solidControls = document.getElementById("solidControls");
  const gradientControls = document.getElementById("gradientControls");
  const angleControl = document.getElementById("angleControl");
  const solidColorInput = document.getElementById("solidColor");
  const color1Input = document.getElementById("color1");
  const color2Input = document.getElementById("color2");
  const angleInput = document.getElementById("angle");
  const outerRadiusRange = document.getElementById("outerRadiusRange");
  const imageRadiusRange = document.getElementById("imageRadiusRange");
  const shadowRange = document.getElementById("shadowRange");
  const paddingRange = document.getElementById("padding");

  const defaultValues = {
    outerRadius: 0,
    imageRadius: 0,
    shadow: 0,
    padding: 18,
  };

  const shadowColor = "rgba(15, 23, 42, 0.35)";

  const colorInputs = [
    { el: "#solidColor", alpha: false },
    { el: "#color1", alpha: true },
    { el: "#color2", alpha: true },
  ];

  let bgMode = "gradient";
  let aspectRatio = null;
  let colorisInstance = null;

  function calculateShadowValues(shadowStrength) {
    const strength = shadowStrength * 0.4;
    const offsetY = strength * 0.8;
    const blur = strength * 2.2;
    const spread = Math.max(0, strength - 6);
    return { offsetY, blur, spread };
  }

  function calculateBackground() {
    if (bgMode === "solid") {
      return solidColorInput.value;
    } else {
      const c1 = color1Input.value;
      const c2 = color2Input.value;
      const angle = angleInput.value;
      return `linear-gradient(${angle}deg, ${c1}, ${c2})`;
    }
  }

  function updateNumberDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  function updateModeUI() {
    const isSolid = bgMode === "solid";
    solidControls.classList.toggle("hidden", !isSolid);
    gradientControls.classList.toggle("hidden", isSolid);
    angleControl.classList.toggle("opacity-50", isSolid);
    angleControl.classList.toggle("opacity-100", !isSolid);
    if (angleInput) {
      angleInput.disabled = isSolid;
    }
  }

  function updateBackground() {
    previewBg.style.background = calculateBackground();
    generateSnippet();
  }

  function syncRangeValue(
    range,
    displayId,
    styleProperty,
    styleTarget,
    transform = null
  ) {
    return (value) => {
      range.value = value;
      updateNumberDisplay(displayId, value);

      const styleValue = transform ? transform(value) : value;
      styleTarget.style[styleProperty] = `${styleValue}px`;
      generateSnippet();
    };
  }

  const syncOuterRadius = syncRangeValue(
    outerRadiusRange,
    "outerRadiusNumber",
    "borderRadius",
    previewBg
  );

  const syncImageRadius = syncRangeValue(
    imageRadiusRange,
    "imageRadiusNumber",
    "borderRadius",
    previewImage
  );

  const syncPadding = syncRangeValue(
    paddingRange,
    "paddingNumber",
    "padding",
    previewBg
  );

  function syncShadow(value) {
    shadowRange.value = value;
    updateNumberDisplay("shadowRangeNumber", value);

    const { offsetY, blur, spread } = calculateShadowValues(value);
    previewImage.style.boxShadow = `0 ${offsetY}px ${blur}px ${spread}px ${shadowColor}`;
    generateSnippet();
  }

  function syncAngle(value) {
    angleInput.value = value;
    updateNumberDisplay("angleValue", value);
    updateBackground();
  }

  function applyAspectRatio(ratioString) {
    aspectRatio = ratioString || null;

    if (aspectRatio) {
      const cssRatio = aspectRatio.replace(":", " / ");
      previewBg.style.aspectRatio = cssRatio;
      previewImage.style.width = "100%";
      previewImage.style.height = "100%";
      previewImage.style.objectFit = "cover";
    } else {
      previewBg.style.aspectRatio = "";
      previewImage.style.width = "";
      previewImage.style.height = "";
      previewImage.style.objectFit = "";
    }

    generateSnippet();
  }

  function generateSnippet() {
    const outerRadius = outerRadiusRange.value;
    const imageRadius = imageRadiusRange.value;
    const padding = paddingRange.value;
    const shadowStrength = shadowRange.value;
    const { offsetY, blur, spread } = calculateShadowValues(shadowStrength);
    const background = calculateBackground();

    const aspectRatioStyle = aspectRatio
      ? `aspect-ratio: ${aspectRatio.replace(":", " / ")};`
      : "";

    const imageStyles = aspectRatio
      ? `width: 100%; height: 100%; object-fit: contain;`
      : `max-width: 100%; height: auto;`;

    const code = `<html>
<head>
  <style>
    .image-container {
      background: ${background};
      border-radius: ${outerRadius}px;
      padding: ${padding}px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      ${aspectRatioStyle}
    }

    .image {
      border-radius: ${imageRadius}px;
      box-shadow: 0 ${offsetY.toFixed(1)}px ${blur.toFixed(
      1
    )}px ${spread.toFixed(1)}px ${shadowColor};
      ${imageStyles}
      display: block;
    }
  </style>
</head>
<body>
  <div class="image-container">
    <img src="your-image.png" alt="Image" class="image" />
  </div>
</body>
</html>`;

    setSnippet(code);
  }

  function updateColorisTheme(darkMode) {
    if (colorisInstance) {
      const colorisConfig = {
        theme: "default",
        themeMode: darkMode ? "dark" : "light",
        format: "hex",
        swatches: [],
      };

      colorInputs.forEach(({ el, alpha }) => {
        colorisInstance({ ...colorisConfig, el, alpha });
      });
    }
  }

  const setupColorPreviews = () => {
    const colorMap = {
      solidColor: "solidColorHex",
      color1: "color1Hex",
      color2: "color2Hex",
    };

    Object.entries(colorMap).forEach(([inputId, hexId]) => {
      const input = document.getElementById(inputId);
      const hexDisplay = document.getElementById(hexId);

      if (input) {
        const updateDisplay = () => {
          input.style.backgroundColor = input.value;
          if (hexDisplay) {
            hexDisplay.textContent = input.value;
          }
        };

        updateDisplay();

        input.addEventListener("input", updateDisplay);
        input.addEventListener("change", updateDisplay);
      }
    });
  };

  const initColorPreviews = () => {
    setupColorPreviews();
    setTimeout(setupColorPreviews, 300);
  };

  if (typeof window !== "undefined") {
    colorisInstance = (await import("@melloware/coloris")).default;
    colorisInstance.init();
    updateColorisTheme(isDarkMode);
  }

  setTimeout(initColorPreviews, 200);

  function setupEventListeners() {
    imageInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImage.src = event.target.result;
        previewImage.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    const ratioButtons = document.querySelectorAll("button[data-ratio]");
    ratioButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const ratio = btn.dataset.ratio === "auto" ? null : btn.dataset.ratio;
        ratioButtons.forEach((b) => b.classList.toggle("active", b === btn));
        applyAspectRatio(ratio);
      });
    });

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        bgMode = btn.dataset.mode;
        modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
        updateModeUI();
        updateBackground();
      });
    });

    [solidColorInput, color1Input, color2Input].forEach((input) => {
      input.addEventListener("input", updateBackground);
    });

    angleInput.addEventListener("input", () => syncAngle(angleInput.value));
    outerRadiusRange.addEventListener("input", () =>
      syncOuterRadius(outerRadiusRange.value)
    );
    imageRadiusRange.addEventListener("input", () =>
      syncImageRadius(imageRadiusRange.value)
    );
    shadowRange.addEventListener("input", () => syncShadow(shadowRange.value));
    paddingRange.addEventListener("input", () =>
      syncPadding(paddingRange.value)
    );
  }

  function initializeUI() {
    modeButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === bgMode)
    );
    updateModeUI();

    updateBackground();
    syncOuterRadius(defaultValues.outerRadius);
    syncImageRadius(defaultValues.imageRadius);
    syncShadow(defaultValues.shadow);
    syncPadding(defaultValues.padding);

    previewImage.src = "/images/unsplash.jpg";
    previewImage.style.display = "block";
  }

  setupEventListeners();
  initializeUI();

  return {
    updateColorisTheme,
    resetDefaultValues: () => {
      bgMode = "gradient";
      modeButtons.forEach((b) =>
        b.classList.toggle("active", b.dataset.mode === bgMode)
      );
      updateModeUI();

      solidColorInput.value = "#cbe7ff";
      color1Input.value = "#cbe7ff";
      color2Input.value = "#ffbbf8";

      setupColorPreviews();

      syncAngle(135);

      syncOuterRadius(defaultValues.outerRadius);
      syncImageRadius(defaultValues.imageRadius);
      syncShadow(defaultValues.shadow);
      syncPadding(defaultValues.padding);

      applyAspectRatio(null);
      const ratioButtons = document.querySelectorAll("button[data-ratio]");
      ratioButtons.forEach((b) => {
        b.classList.toggle("active", b.dataset.ratio === "auto");
      });
    },
  };
}

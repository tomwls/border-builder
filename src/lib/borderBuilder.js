export async function initBorderBuilder(setSnippet, isDarkMode = true) {
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

  let bgMode = "gradient";

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

  function generateSnippet() {
    const outerRadius = outerRadiusRange.value;
    const imageRadius = imageRadiusRange.value;
    const padding = paddingRange.value;

    const shadowStrength = shadowRange.value;
    const { offsetY, blur, spread } = calculateShadowValues(shadowStrength);

    const background = calculateBackground();

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
    }

    .image {
      border-radius: ${imageRadius}px;
      box-shadow: 0 ${offsetY.toFixed(1)}px ${blur.toFixed(
      1
    )}px ${spread.toFixed(1)}px ${shadowColor};
      max-width: 100%;
      height: auto;
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

  let colorisInstance = null;
  const colorInputs = [
    { el: "#solidColor", alpha: false },
    { el: "#color1", alpha: true },
    { el: "#color2", alpha: true },
  ];

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

  if (typeof window !== "undefined") {
    colorisInstance = (await import("@melloware/coloris")).default;
    colorisInstance.init();
    updateColorisTheme(isDarkMode);
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
      console.log("Image source:", file.name, file.type, file.size, "bytes");
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

    // Ternary operator no longer needed, leaving for future use
    previewImage.src = isDarkMode
      ? "/images/unsplash.jpg"
      : "/images/unsplash.jpg";
    previewImage.style.display = "block";
  }

  setupEventListeners();
  initializeUI();

  return { updateColorisTheme };
}

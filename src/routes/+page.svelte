<script>
  import { onMount, tick } from "svelte";
  import { initBorderBuilder } from "$lib/borderBuilder.js";
  import { domToPng } from "modern-screenshot";
  import "@melloware/coloris/dist/coloris.css";
  import hljs from "highlight.js";

  let darkMode = false;
  let code = "";
  let codeElement;
  let borderBuilderControls = null;

  function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
    if (borderBuilderControls?.updateColorisTheme) {
      borderBuilderControls.updateColorisTheme(darkMode);
    }
  }

  async function exportImage() {
    const previewBg = document.getElementById("previewBg");
    const previewImage = document.getElementById("previewImage");
    const loadingDiv = document.getElementById("export-loading");

    if (!previewBg || !previewImage) return;

    try {
      if (loadingDiv) {
        loadingDiv.classList.remove("hidden");
      }

      const img = new Image();
      if (!previewImage.src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewImage.src;
      });

      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;

      const bgRect = previewBg.getBoundingClientRect();
      const imgRect = previewImage.getBoundingClientRect();

      if (
        !bgRect.width ||
        !bgRect.height ||
        !imgRect.width ||
        !imgRect.height
      ) {
        throw new Error("Preview has zero dimensions; cannot export.");
      }

      const computedImgStyle = window.getComputedStyle(previewImage);
      const fit =
        computedImgStyle.objectFit || previewImage.style.objectFit || "contain";

      // Scale factor is derived from the original image size vs its displayed size in the preview.
      const scale =
        fit === "cover"
          ? Math.max(
              originalWidth / imgRect.width,
              originalHeight / imgRect.height
            )
          : Math.min(
              originalWidth / imgRect.width,
              originalHeight / imgRect.height
            );

      const exportScale = Math.max(1, scale);

      // We want full-quality output *and* identical geometry. The most reliable way is to capture
      // a scaled clone, rather than trying to re-derive layout in JS.
      const exportWidth = Math.round(bgRect.width * exportScale);
      const exportHeight = Math.round(bgRect.height * exportScale);

      const exportWrapper = document.createElement("div");
      exportWrapper.id = "previewBgExportWrapper";
      exportWrapper.style.position = "fixed";
      exportWrapper.style.left = "0";
      exportWrapper.style.top = "0";
      exportWrapper.style.width = `${exportWidth}px`;
      exportWrapper.style.height = `${exportHeight}px`;
      exportWrapper.style.overflow = "visible";
      exportWrapper.style.pointerEvents = "none";
      exportWrapper.style.zIndex = "0";

      const exportClone = previewBg.cloneNode(true);
      exportClone.id = "previewBgExportClone";
      exportClone.classList.add("exporting");
      exportClone.style.position = "absolute";
      exportClone.style.left = "0";
      exportClone.style.top = "0";
      exportClone.style.margin = "0";
      // Freeze base (unscaled) layout size to exactly match the preview box.
      exportClone.style.width = `${Math.round(bgRect.width)}px`;
      exportClone.style.height = `${Math.round(bgRect.height)}px`;
      exportClone.style.transformOrigin = "top left";
      exportClone.style.transform = `scale(${exportScale})`;
      exportClone.style.maxWidth = "none";
      exportClone.style.minWidth = "auto";
      exportClone.style.pointerEvents = "none";

      const exportCloneImg = exportClone.querySelector("#previewImage");
      if (exportCloneImg) exportCloneImg.id = "previewImageExportClone";

      exportWrapper.appendChild(exportClone);
      document.body.appendChild(exportWrapper);

      // Ensure the cloned <img> is decoded/ready before capture.
      const imgEl = exportClone.querySelector("img");
      if (imgEl && !imgEl.complete) {
        await new Promise((resolve) => {
          imgEl.addEventListener("load", resolve, { once: true });
          imgEl.addEventListener("error", resolve, { once: true });
        });
      } else if (imgEl?.decode) {
        try {
          await imgEl.decode();
        } catch {
          // ignore decode failures (e.g. cross-origin); best-effort only
        }
      }

      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      const dataUrl = await domToPng(exportWrapper, {
        backgroundColor: null,
        width: exportWidth,
        height: exportHeight,
        pixelRatio: 1,
        skipFonts: true,
        quality: 1.0,
      });

      exportWrapper.remove();

      if (loadingDiv) {
        loadingDiv.classList.add("hidden");
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "border-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting image:", error);
      if (loadingDiv) {
        loadingDiv.classList.add("hidden");
      }
      document.getElementById("previewBgExportWrapper")?.remove();
      document.getElementById("previewBgExportClone")?.remove();
    }
  }

  async function highlightCode() {
    if (codeElement && code) {
      await tick();
      try {
        const highlighted = hljs.highlight(code, { language: "html" });
        codeElement.innerHTML = highlighted.value;
      } catch (e) {
        codeElement.textContent = code;
      }
    }
  }

  async function copyCode(text) {
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById("copyMessage").classList.add("visible");
      setTimeout(() => {
        document.getElementById("copyMessage").classList.remove("visible");
      }, 2000);
      return true;
    } catch (error) {
      console.error("Failed to copy code:", error);
      return false;
    }
  }

  async function handleCopyCode() {
    if (code) {
      const success = await copyCode(code);
      if (success) return;
    }
  }

  onMount(async () => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") {
      darkMode = true;
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    borderBuilderControls = await initBorderBuilder((snippet) => {
      code = snippet;
    }, darkMode);
  });

  $: if (code) {
    highlightCode();
  }
</script>

<svelte:head>
  <title>Border Builder - Image Border Generator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div
  class="min-h-screen flex justify-center items-center font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-300"
>
  <div
    class="w-full max-w-6xl mx-3 sm:mx-6 my-4 sm:my-6 flex flex-col gap-4 sm:gap-5"
  >
    <header class="flex items-center justify-between px-3 sm:px-0">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex w-6 h-6 items-center justify-center text-blue-500 dark:text-blue-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M2 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2M0 2a2 2 0 0 1 3.937-.5h8.126A2 2 0 1 1 14.5 3.937v8.126a2 2 0 1 1-2.437 2.437H3.937A2 2 0 1 1 1.5 12.063V3.937A2 2 0 0 1 0 2m2.5 1.937v8.126c.703.18 1.256.734 1.437 1.437h8.126a2 2 0 0 1 1.437-1.437V3.937A2 2 0 0 1 12.063 2.5H3.937A2 2 0 0 1 2.5 3.937M14 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2M2 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2m12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
            />
          </svg>
        </span>
        <span class="text-sm font-medium text-blue-500 dark:text-blue-400"
          ><a href="/" class="no-underline cursor-default">Border Builder</a
          ></span
        >
      </div>
      <button
        type="button"
        onclick={toggleDarkMode}
        class="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
        aria-label="Toggle dark mode"
      >
        <span class="text-xs text-gray-400 dark:text-gray-400">
          {darkMode ? "Lights On" : "Lights Off"}
        </span>
        {#if darkMode}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="#fbbf24"
            viewBox="0 0 16 16"
          >
            <path
              d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"
            />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="#a855f7"
            viewBox="0 0 16 16"
          >
            <path
              d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278M4.858 1.311A7.269 7.269 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.316 7.316 0 0 0 5.205-2.162c-.337.042-.68.063-1.029.063-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286z"
            />
          </svg>
        {/if}
      </button>
    </header>

    <div
      id="export-loading"
      class="hidden fixed inset-0 z-[10000] flex items-center justify-center bg-white dark:bg-gray-900"
    >
      <span class="loader"></span>
    </div>

    <section class="rounded-2xl p-2 sm:p-3">
      <div class="flex justify-center items-center p-1 sm:p-2">
        <div
          class="relative min-h-[200px] sm:min-h-[260px] min-w-[200px] sm:min-w-[260px] max-w-[260px] sm:max-w-none inline-flex justify-center items-center transition-all duration-150 ease-out overflow-hidden"
          id="previewBg"
        >
          <img
            id="previewImage"
            class="max-w-full max-h-[420px] block object-contain rounded-none"
            style="display: none"
            alt=""
          />
        </div>
      </div>
    </section>

    <div class="flex flex-row px-2 justify-center items-center gap-2 w-full">
      <label
        for="imageInput"
        class="inline-block flex-1 sm:flex-none sm:w-auto px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 active:bg-green-200 dark:active:bg-green-900/50 cursor-pointer transition-colors text-center"
      >
        <span class="sm:hidden">Upload</span><span class="hidden sm:inline"
          >Upload Image</span
        >
      </label>
      <input type="file" id="imageInput" accept="image/*" class="sr-only" />
      <label
        onclick={() => borderBuilderControls?.resetDefaultValues?.()}
        class="inline-block flex-1 sm:flex-none sm:w-auto px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 active:bg-red-200 dark:active:bg-red-900/50 cursor-pointer transition-colors text-center"
      >
        <span class="sm:hidden">Reset</span><span class="hidden sm:inline"
          >Reset Canvas</span
        >
      </label>
      <label
        onclick={exportImage}
        class="inline-block flex-1 sm:flex-none sm:w-auto px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 active:bg-blue-200 dark:active:bg-blue-900/50 cursor-pointer transition-colors text-center"
      >
        <span class="sm:hidden">Download</span><span class="hidden sm:inline"
          >Download Result</span
        >
      </label>
    </div>

    <section class="flex justify-center mt-2">
      <div class="rounded-2xl p-2 sm:p-3 max-w-5xl w-full">
        <div
          class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch"
        >
          <div
            class="flex flex-col items-center gap-2 justify-center bg-gray-100/50 dark:bg-gray-800/40 border-none border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 h-full"
          >
            <div class="grid grid-cols-3 gap-2" role="group">
              <button
                type="button"
                data-ratio="auto"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                Auto
              </button>
              <button
                type="button"
                data-ratio="1:1"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                1:1
              </button>
              <button
                type="button"
                data-ratio="4:3"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                4:3
              </button>
              <button
                type="button"
                data-ratio="16:9"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                16:9
              </button>
              <button
                type="button"
                data-ratio="3:2"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                3:2
              </button>
              <button
                type="button"
                data-ratio="9:16"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                9:16
              </button>
            </div>
          </div>

          <div
            class="flex flex-col items-center gap-2 justify-center bg-gray-100/50 dark:bg-gray-800/40 border-none border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 h-full"
          >
            <div class="inline-flex rounded-md mb-2" role="group">
              <button
                type="button"
                data-mode="solid"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                Solid
              </button>
              <button
                type="button"
                data-mode="gradient"
                class="px-3 py-2 text-sm font-normal text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
              >
                Gradient
              </button>
            </div>

            <div id="solidControls" class="hidden flex items-center">
              <div class="flex items-center gap-1">
                <input
                  type="text"
                  id="solidColor"
                  value="#cbe7ff"
                  class="h-8 w-8 cursor-pointer border border-gray-300 dark:border-gray-600 flex-shrink-0"
                  style="background-color: var(--color-value); color: transparent; text-indent: -9999px;"
                />
                <span
                  id="solidColorHex"
                  class="text-sm text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
                  >#cbe7ff</span
                >
              </div>
            </div>

            <div id="gradientControls" class="hidden flex items-center">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <input
                    type="text"
                    id="color1"
                    value="#cbe7ff"
                    class="h-8 w-8 cursor-pointer border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style="background-color: var(--color-value); color: transparent; text-indent: -9999px;"
                  />
                  <span
                    id="color1Hex"
                    class="text-sm text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
                    >#cbe7ff</span
                  >
                </div>
                <div class="flex items-center gap-1">
                  <input
                    type="text"
                    id="color2"
                    value="#ffbbf8"
                    class="h-8 w-8 cursor-pointer border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style="background-color: var(--color-value); color: transparent; text-indent: -9999px;"
                  />
                  <span
                    id="color2Hex"
                    class="text-sm text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
                    >#ffbbf8</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex flex-col items-center gap-1 justify-center bg-gray-100/50 dark:bg-gray-800/40 border-none border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 h-full"
          >
            <div
              class="flex items-center gap-2 flex-wrap justify-center sm:justify-start"
            >
              <label
                for="outerRadiusRange"
                class="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] sm:min-w-20 text-center"
              >
                Outer °
              </label>
              <input
                type="range"
                id="outerRadiusRange"
                min="0"
                max="80"
                value="12"
                class="w-24 sm:w-32 flex-1 max-w-40"
              />
              <span
                id="outerRadiusNumber"
                class="w-6 sm:w-4 text-sm text-blue-400 dark:text-blue-400 text-center"
                >12</span
              >
            </div>

            <div
              class="flex items-center gap-2 flex-wrap justify-center sm:justify-start"
            >
              <label
                for="imageRadiusRange"
                class="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] sm:min-w-20 text-center"
              >
                Image °
              </label>
              <input
                type="range"
                id="imageRadiusRange"
                min="0"
                max="120"
                value="12"
                class="w-24 sm:w-32 flex-1 max-w-40"
              />
              <span
                id="imageRadiusNumber"
                class="w-6 sm:w-4 text-sm text-blue-400 dark:text-blue-400 text-center"
                >12</span
              >
            </div>

            <div
              class="flex items-center gap-2 flex-wrap justify-center sm:justify-start"
            >
              <label
                for="padding"
                class="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] sm:min-w-20 text-center"
              >
                Padding
              </label>
              <input
                type="range"
                id="padding"
                min="0"
                max="120"
                value="32"
                class="w-24 sm:w-32 flex-1 max-w-40"
              />
              <span
                id="paddingNumber"
                class="w-6 sm:w-4 text-sm text-blue-400 dark:text-blue-400 text-center"
                >32</span
              >
            </div>

            <div
              class="flex items-center gap-2 flex-wrap justify-center sm:justify-start"
            >
              <label
                for="shadow"
                class="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] sm:min-w-20 text-center"
              >
                Shadow
              </label>
              <input
                type="range"
                id="shadowRange"
                min="0"
                max="120"
                value="2"
                class="w-24 sm:w-32 flex-1 max-w-40"
              />
              <span
                id="shadowRangeNumber"
                class="w-6 sm:w-4 text-sm text-blue-400 dark:text-blue-400 text-center"
                >2</span
              >
            </div>
            <div
              id="angleControl"
              class="flex items-center gap-2 flex-wrap justify-center sm:justify-start opacity-50"
            >
              <label
                for="angle"
                class="text-sm text-gray-600 dark:text-gray-300 min-w-[80px] sm:min-w-20 text-center"
                >Angle</label
              >
              <input
                type="range"
                id="angle"
                min="0"
                max="360"
                value="135"
                class="w-24 sm:w-32 flex-1 max-w-40"
              />
              <span
                id="angleValue"
                class="w-6 sm:w-4 text-sm text-blue-400 dark:text-blue-400 text-center"
                >135</span
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="flex justify-center mt-2">
      <div class="rounded-2xl p-2 sm:p-3 max-w-3xl w-full">
        <div
          class="flex items-center justify-between px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-t-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-code text-gray-600 dark:text-gray-300"
            viewBox="0 0 16 16"
          >
            <path
              d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8z"
            />
          </svg>
          <div class="flex items-center gap-2">
            <div
              id="copyMessage"
              class="text-xs font-normal text-green-500 dark:text-green-400"
            >
              Copied to clipboard
            </div>
            <button
              type="button"
              onclick={handleCopyCode}
              class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              aria-label="Copy code"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-copy"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"
                />
              </svg>
            </button>
          </div>
        </div>
        <pre
          class="overflow-x-auto border border-t-0 border-gray-300 dark:border-gray-600 rounded-b-lg p-3 sm:p-4 bg-gray-100/50 dark:bg-gray-800/40"><code
            bind:this={codeElement}
            class="text-xs sm:text-sm font-mono hljs block"></code></pre>
      </div>
    </section>

    <footer class="flex justify-center">
      <p
        class="text-xs text-gray-500 dark:text-gray-400 text-center"
        style="line-height: 1.25rem;"
      >
        Built by <a
          href="https://github.com/tomwls"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >Tom</a
        >
        and hosted on
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >Vercel</a
        >.
        <br />
        Photo by
        <a
          href="https://unsplash.com/@zhenyao_photo?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >Zhen Yao</a
        >
        on
        <a
          href="https://unsplash.com/photos/red-bus-with-neon-sign-in-mong-kok-CaClc4rjiyI?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >Unsplash</a
        >.
      </p>
    </footer>
  </div>
</div>

<style>
  :global(input[type="range"]) {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: transparent;
    border: none;
    border-radius: 0;
    outline: none;
  }

  :global(input[type="range"]::-webkit-slider-runnable-track) {
    -webkit-appearance: none;
    height: 8px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
  }

  :global(.dark input[type="range"]::-webkit-slider-runnable-track) {
    background: #1f2937;
    border: 1px solid #4b5563;
  }

  :global(input[type="range"]::-webkit-slider-thumb) {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    margin-top: -5px;
  }

  :global(input[type="range"]::-webkit-slider-thumb:hover) {
    background: #f9fafb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  :global(.dark input[type="range"]::-webkit-slider-thumb) {
    background: #1f2937;
    border: 1px solid #4b5563;
  }

  :global(.dark input[type="range"]::-webkit-slider-thumb:hover) {
    background: #374151;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :global(input[type="range"]::-moz-range-thumb) {
    width: 18px;
    height: 18px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  :global(input[type="range"]::-moz-range-thumb:hover) {
    background: #f9fafb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  :global(input[type="range"]::-moz-range-track) {
    height: 8px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
  }

  :global(.dark input[type="range"]::-moz-range-track) {
    background: #1f2937;
    border: 1px solid #4b5563;
  }

  :global(.dark input[type="range"]::-moz-range-thumb) {
    background: #1f2937;
    border: 1px solid #4b5563;
  }

  :global(.dark input[type="range"]::-moz-range-thumb:hover) {
    background: #374151;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :global(input[type="range"]:disabled) {
    opacity: 0.5;
  }

  :global(.active) {
    background: #e5e7eb !important;
    color: #1f2937 !important;
  }

  :global(.dark .active) {
    background: #374151 !important;
    color: #f3f4f6 !important;
  }

  :global(#solidColor),
  :global(#color1),
  :global(#color2) {
    color: #374151 !important;
  }

  :global(.dark #solidColor),
  :global(.dark #color1),
  :global(.dark #color2) {
    color: #9ca3af !important;
  }

  :global(#solidColor::selection),
  :global(#color1::selection),
  :global(#color2::selection) {
    color: #374151 !important;
    background-color: transparent;
  }

  :global(.dark #solidColor::selection),
  :global(.dark #color1::selection),
  :global(.dark #color2::selection) {
    color: #9ca3af !important;
    background-color: transparent;
  }

  :global(.clr-field input) {
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    border: 1px solid #d1d5db !important;
    color: transparent !important;
    text-indent: -9999px !important;
    cursor: pointer !important;
    margin-right: 0.25rem !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    caret-color: transparent !important;
  }

  :global(.clr-field input::selection) {
    background: transparent !important;
  }

  :global(.clr-field input::-moz-selection) {
    background: transparent !important;
  }

  :global(.dark .clr-field input) {
    border-color: #4b5563 !important;
  }

  :global(.clr-field button) {
    display: none !important;
  }

  :global(.dark .clr-picker) {
    background: #1f2937 !important;
    border-color: #4b5563 !important;
  }

  :global(.clr-picker::before),
  :global(.clr-picker::after) {
    display: none !important;
  }

  :global(.clr-picker) {
    margin-top: 8px !important;
  }

  :global(.dark .clr-picker input[type="text"]) {
    background: #111827 !important;
    border-color: #4b5563 !important;
    color: #e5e7eb !important;
  }

  :global(.dark .clr-picker input[type="text"]:focus) {
    border-color: #6b7280 !important;
  }

  :global(.dark .clr-format button) {
    background: #111827 !important;
    border-color: #4b5563 !important;
    color: #e5e7eb !important;
  }

  :global(.dark .clr-format button:hover) {
    background: #374151 !important;
  }

  :global(.dark .clr-format button.clr-active) {
    background: #374151 !important;
  }

  :global(.dark .clr-swatches button) {
    border-color: #4b5563 !important;
  }

  :global(#previewBg.exporting) {
    max-width: none !important;
    min-width: auto !important;
  }

  /* IMPORTANT:
     Export should capture the preview *as laid out*.
     The following override used to force the image to re-layout during export,
     causing mismatches vs preview. Keep export overrides minimal/inert. */
  /* :global(#previewBg.exporting #previewImage) {} */

  :global(.hljs) {
    background: transparent !important;
    color: #24292e !important;
  }

  :global(.hljs *) {
    background: transparent !important;
  }

  :global(.hljs-comment),
  :global(.hljs-quote) {
    color: #6a737d !important;
    font-style: italic;
  }

  :global(.hljs-keyword),
  :global(.hljs-selector-tag),
  :global(.hljs-type) {
    color: #d73a49 !important;
  }

  :global(.hljs-selector-class),
  :global(.hljs-selector-id),
  :global(.hljs-selector-attr),
  :global(.hljs-selector-pseudo) {
    color: #6f42c1 !important;
  }

  :global(.hljs-string),
  :global(.hljs-literal),
  :global(.hljs-number) {
    color: #032f62 !important;
  }

  :global(.hljs-title),
  :global(.hljs-section),
  :global(.hljs-attribute),
  :global(.hljs-symbol),
  :global(.hljs-variable),
  :global(.hljs-template-variable),
  :global(.hljs-regexp),
  :global(.hljs-link) {
    color: #005cc5 !important;
  }

  :global(.hljs-property),
  :global(.hljs-name) {
    color: #e36209 !important;
  }

  :global(.hljs-built_in),
  :global(.hljs-builtin-name) {
    color: #e36209 !important;
  }

  :global(.hljs-meta) {
    color: #6a737d !important;
  }

  :global(.hljs-deletion) {
    background: #ffeef0 !important;
  }

  :global(.hljs-addition) {
    background: #f0fff4 !important;
  }

  :global(.hljs-emphasis) {
    font-style: italic;
  }

  :global(.hljs-strong) {
    font-weight: bold;
  }

  :global(.dark .hljs) {
    background: transparent !important;
    color: #c9d1d9 !important;
  }

  :global(.dark .hljs *) {
    background: transparent !important;
  }

  :global(.dark .hljs-comment),
  :global(.dark .hljs-quote) {
    color: #8b949e !important;
    font-style: italic;
  }

  :global(.dark .hljs-keyword),
  :global(.dark .hljs-selector-tag),
  :global(.dark .hljs-type) {
    color: #ff7b72 !important;
  }

  :global(.dark .hljs-selector-class),
  :global(.dark .hljs-selector-id),
  :global(.dark .hljs-selector-attr),
  :global(.dark .hljs-selector-pseudo) {
    color: #d2a8ff !important;
  }

  :global(.dark .hljs-string),
  :global(.dark .hljs-literal),
  :global(.dark .hljs-number) {
    color: #a5d6ff !important;
  }

  :global(.dark .hljs-title),
  :global(.dark .hljs-section),
  :global(.dark .hljs-attribute),
  :global(.dark .hljs-symbol),
  :global(.dark .hljs-variable),
  :global(.dark .hljs-template-variable),
  :global(.dark .hljs-regexp),
  :global(.dark .hljs-link) {
    color: #79c0ff !important;
  }

  :global(.dark .hljs-property),
  :global(.dark .hljs-name) {
    color: #ffa657 !important;
  }

  :global(.dark .hljs-built_in),
  :global(.dark .hljs-builtin-name) {
    color: #ffa657 !important;
  }

  :global(.dark .hljs-meta) {
    color: #8b949e !important;
  }

  :global(.dark .hljs-deletion) {
    background: #490202 !important;
  }

  :global(.dark .hljs-addition) {
    background: #033a16 !important;
  }

  :global(.loader) {
    width: 48px;
    height: 48px;
    border: 5px solid #3b82f6;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }

  :global(.dark .loader) {
    border-color: #60a5fa;
    border-bottom-color: transparent;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  :global(#copyMessage) {
    opacity: 0;
    transform: translateX(10px);
    transition:
      opacity 0.2s ease-out,
      transform 0.2s ease-out;
    pointer-events: none;
  }

  :global(#copyMessage.visible) {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
</style>

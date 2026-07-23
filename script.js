const video = document.getElementById("video");
const list = document.getElementById("channelList");
const categorySelect = document.getElementById("categorySelect");
const searchInput = document.getElementById("searchInput");

// Menu elements
const menuBtn = document.getElementById("menuBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const reloadBtn = document.getElementById("reloadBtn");
const aboutBtn = document.getElementById("aboutBtn");

let allChannels = [];
let hls = null;

// ১. M3U ফাইল ফেচ ও পার্স করা
function fetchPlaylist() {
  fetch("mixiptvchannel.m3u")
    .then(r => r.text())
    .then(data => {
      allChannels = [];
      const lines = data.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#EXTINF:")) {
          const name = line.split(",").pop().trim();
          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          const groupMatch = line.match(/group-title="([^"]+)"/);

          const logo = logoMatch ? logoMatch[1] : "";
          const group = groupMatch ? groupMatch[1] : "ALL";

          let url = "";
          for (let j = i + 1; j < lines.length; j++) {
            const candidate = lines[j].trim();
            if (candidate && !candidate.startsWith("#")) {
              url = candidate;
              break;
            }
          }

          if (url) {
            allChannels.push({ name, logo, group, url });
          }
        }
      }

      // ক্যাটাগরি ড্রপডাউনে পাওয়া গ্রুপগুলো স্বয়ংক্রিয়ভাবে আপডেট করা (অপশনাল)
      updateCategoryDropdownOptions();

      filterAndRender();
    })
    .catch(err => console.error("Error loading M3U file:", err));
}

// M3U এর Group অনুযায়ী Category Select Box ডাইনামিক করা
function updateCategoryDropdownOptions() {
  const groups = new Set(["ALL"]);
  allChannels.forEach(ch => {
    if (ch.group) groups.add(ch.group.toUpperCase());
  });

  const currentSelection = categorySelect.value;
  categorySelect.innerHTML = "";

  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    categorySelect.appendChild(option);
  });

  if (groups.has(currentSelection)) {
    categorySelect.value = currentSelection;
  }
}

// ২. ফিল্টার ও সার্চ অনুযায়ী চ্যানেল রেন্ডার করা
function filterAndRender() {
  const selectedCat = categorySelect.value.toUpperCase();
  const query = searchInput.value.trim().toLowerCase();

  const filtered = allChannels.filter(ch => {
    const matchCategory =
      selectedCat === "ALL" || ch.group.toUpperCase().includes(selectedCat);
    const matchSearch = ch.name.toLowerCase().includes(query);

    return matchCategory && matchSearch;
  });

  render(filtered);
}

function render(data) {
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = `<div style="color:#a0a0b0; padding:20px; grid-column: 1/-1; text-align: center;">কোনো চ্যানেল পাওয়া যায়নি।</div>`;
    return;
  }

  data.forEach(ch => {
    const card = document.createElement("div");
    card.className = "card";

    const logoSrc = ch.logo ? ch.logo : "logo.png";
    card.innerHTML = `
      <img src="${logoSrc}" alt="${ch.name}" onerror="this.onerror=null; this.src='logo.png';">
      <div>${ch.name}</div>
    `;

    card.onclick = () => {
      document.querySelectorAll(".card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      play(ch.url);
    };

    list.appendChild(card);
  });
}

// ৩. ইভেন্ট লিসেনার (Category Dropdown & Search Input)
categorySelect.addEventListener("change", filterAndRender);
searchInput.addEventListener("input", filterAndRender);

// ৪. হেডার মেনু হ্যান্ডলার
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
});

document.addEventListener("click", () => {
  dropdownMenu.classList.remove("show");
});

reloadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fetchPlaylist();
  dropdownMenu.classList.remove("show");
});

aboutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  alert("SA IPTV BD LIVE v2.0\nPowered by HLS.js");
  dropdownMenu.classList.remove("show");
});

// ৫. স্ট্রিম প্লেয়ার
function play(url) {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  const cleanUrl = url.trim();

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(cleanUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log("Autoplay issue:", e));
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = cleanUrl;
    video.play().catch(e => console.log("Autoplay issue:", e));
  }
}

// অ্যাপ রান করা
fetchPlaylist();

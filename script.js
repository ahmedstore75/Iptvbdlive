const video = document.getElementById("video");
const list = document.getElementById("channelList");
const categorySelect = document.getElementById("categorySelect");
const searchInput = document.getElementById("searchInput");

const menuBtn = document.getElementById("menuBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const reloadBtn = document.getElementById("reloadBtn");
const aboutBtn = document.getElementById("aboutBtn");

let allChannels = [];
let hls = null;

// M3U ফাইল ফেচ ও পার্স করা
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

      updateCategoryDropdownOptions();
      filterAndRender();
    })
    .catch(err => console.error("Error loading M3U file:", err));
}

// M3U ফাইল থেকে সরাসরি গ্রুপ ডাইনামিক করা
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

// ফিল্টার ও সার্চ লজিক
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
    list.innerHTML = `<div style="color:#a0a0b0; padding:15px; grid-column: 1/-1; text-align: center; font-size: 13px;">কোনো চ্যানেল পাওয়া যায়নি।</div>`;
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

categorySelect.addEventListener("change", filterAndRender);
searchInput.addEventListener("input", filterAndRender);

// ৩-দাগ মেনু ইভেন্ট
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
  alert("SA IPTV BD LIVE\nVersion: 2.5");
  dropdownMenu.classList.remove("show");
});

// প্লেয়ার লজিক
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

fetchPlaylist();

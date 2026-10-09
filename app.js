const OWNER_EMAIL = "a.t.prajjwal.tyagi@gmail.com";
let currentUser = null;
let selectedAttachedPhoto = null;
let stressChartInstance = null;

const indiaLocationsDB = [
    "Agartala, Tripura", "Agra, Uttar Pradesh", "Ahmedabad, Gujarat", "Aizawl, Mizoram",
    "Ajmer, Rajasthan", "Amritsar, Punjab", "Bengaluru, Karnataka", "Bhopal, MP",
    "Bhubaneswar, Odisha", "Chandigarh, UT", "Chennai, Tamil Nadu", "Coimbatore, Tamil Nadu",
    "Dalanwala, Dehradun", "Dehradun, Uttarakhand", "Defence Colony, New Delhi", "Delhi NCR",
    "Dhanbad, Jharkhand", "Dispur, Assam", "Dwarka, New Delhi", "Faridabad, Haryana",
    "Gurugram, Haryana", "Guwahati, Assam", "Hyderabad, Telangana", "Indore, MP",
    "Jaipur, Rajasthan", "Kolkata, West Bengal", "Lucknow, UP", "Mumbai, Maharashtra",
    "Noida, UP", "Patna, Bihar", "Pune, Maharashtra", "Ranchi, Jharkhand", "Surat, Gujarat"
];

// Initial Issues List (Strict zero initial likes/comments)
let cityIssues = [
    {
        id: "NO-9012",
        category: "Open Drain & Flood Risk",
        location: "Dehradun, UK",
        description: "Deep open drainage overflowing near main market intersection causing risk to commuters.",
        photo: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
        reporter: "citizen_local@gmail.com",
        status: "Taskforce Dispatched",
        likes: 0,
        likedBy: [],
        comments: [],
        timestamp: "2026-10-09 12:30 PM"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initAutoSuggestEngine();
    initStressChart();
    checkStoredUserSession();
    renderPublicIssues();
});

// TAB NAVIGATION
function initTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const b = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const c = document.getElementById(tabId);
    if (b) b.classList.add('active');
    if (c) c.classList.add('active');
}

// REAL-TIME GPS REVERSE GEOCODING
function getExactGPSLocation() {
    const btn = document.getElementById('gpsAutoBtn');
    const input = document.getElementById('globalLocationInput');
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }

    btn.classList.add('loading');
    input.value = "Fetching exact GPS location...";

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
            const data = await res.json();
            btn.classList.remove('loading');
            if (data && data.address) {
                const addr = data.address;
                const formatted = [addr.road || addr.suburb, addr.city || addr.town, addr.state, addr.postcode].filter(Boolean).join(', ');
                input.value = formatted;
                updateLocationData(formatted);
            }
        } catch(e) {
            btn.classList.remove('loading');
            input.value = `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
            updateLocationData(input.value);
        }
    }, (err) => { btn.classList.remove('loading'); alert("GPS Access Denied."); input.value = ""; });
}

// AUTO SUGGEST ENGINE
function initAutoSuggestEngine() {
    const input = document.getElementById('globalLocationInput');
    const box = document.getElementById('locationSuggestions');

    input.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) { box.classList.remove('active'); return; }
        const matches = indiaLocationsDB.filter(l => l.toLowerCase().includes(val));
        if (matches.length > 0) {
            box.innerHTML = matches.map(m => `<div class="suggestion-item" onclick="selectLocation('${m}')"><i class="fa-solid fa-location-dot" style="color:var(--primary-cyan);"></i> ${m}</div>`).join('');
        } else {
            box.innerHTML = `<div class="suggestion-item" onclick="selectLocation('${e.target.value}')"><i class="fa-solid fa-plus"></i> Use Custom: "${e.target.value}"</div>`;
        }
        box.classList.add('active');
    });
}

function selectLocation(loc) {
    document.getElementById('globalLocationInput').value = loc;
    document.getElementById('locationSuggestions').classList.remove('active');
    updateLocationData(loc);
}

function updateLocationData(loc) {
    document.getElementById('activeLocationDisplay').textContent = loc;
    document.getElementById('issueLocationInput').value = loc;
    const c = loc.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    document.getElementById('valTraffic').textContent = `${(c % 40) + 30}%`;
    document.getElementById('valAqi').textContent = `${(c % 60) + 40}`;
    document.getElementById('valEnergy').textContent = `${(c % 30) + 65}%`;
    document.getElementById('valNodes').textContent = `${(c * 11) % 2500 + 700}`;
}

// PHOTO ATTACHMENT SELECTION & PREVIEW
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedAttachedPhoto = event.target.result;
            document.getElementById('photoPreviewImg').src = selectedAttachedPhoto;
            document.getElementById('photoFileName').textContent = file.name;
            document.getElementById('photoPreviewContainer').style.display = "flex";
        };
        reader.readAsDataURL(file);
    }
}

function removeAttachedPhoto() {
    selectedAttachedPhoto = null;
    document.getElementById('issuePhotoInput').value = "";
    document.getElementById('photoPreviewContainer').style.display = "none";
}

// ISSUE REPORT SUBMISSION
function handleIssueSubmit(e) {
    e.preventDefault();
    const category = document.getElementById('issueCategoryInput').value.trim();
    const location = document.getElementById('issueLocationInput').value.trim();
    const description = document.getElementById('issueDescInput').value.trim();

    const newIssue = {
        id: `NO-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        location,
        description,
        photo: selectedAttachedPhoto || "",
        reporter: currentUser ? currentUser.email : "Guest Citizen",
        status: 'Received',
        likes: 0,
        likedBy: [],
        comments: [],
        timestamp: new Date().toLocaleString()
    };

    cityIssues.unshift(newIssue);
    renderPublicIssues();
    if (currentUser && currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        renderOwnerTable();
    }

    document.getElementById('issueReportForm').reset();
    removeAttachedPhoto();
    document.getElementById('empathyModal').classList.add('active');
}

// PUBLIC ISSUE FEED & INTERACTIONS
function renderPublicIssues() {
    const feed = document.getElementById('publicIssueFeed');
    if (cityIssues.length === 0) {
        feed.innerHTML = `<p style="color: var(--text-muted);">No incident reports logged yet.</p>`;
        return;
    }

    feed.innerHTML = cityIssues.map(issue => `
        <div class="issue-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>${escapeHtml(issue.category)}</h3>
                <span class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem;">${issue.status}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--primary-cyan); margin-top:0.2rem;">
                <i class="fa-solid fa-location-dot"></i> ${escapeHtml(issue.location)}
            </div>
            <p style="font-size:0.88rem; color:#cbd5e1; margin-top:0.5rem;">${escapeHtml(issue.description)}</p>
            ${issue.photo ? `<img src="${issue.photo}" class="issue-photo-attached">` : ''}

            <div class="interaction-bar">
                <button class="action-btn" onclick="toggleLike('${issue.id}')"><i class="fa-solid fa-heart"></i> ${issue.likes} Likes</button>
                <button class="action-btn" onclick="toggleComments('${issue.id}')"><i class="fa-solid fa-comment"></i> ${issue.comments.length} Comments</button>
            </div>

            <div class="comments-section" id="comments-${issue.id}">
                <div>
                    ${issue.comments.map(c => `<div class="comment-item"><strong>${escapeHtml(c.user)}</strong>${escapeHtml(c.text)}</div>`).join('')}
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <input type="text" id="comment-input-${issue.id}" class="form-control" placeholder="Write a comment..." style="padding:0.4rem;">
                    <button class="btn btn-cyan" style="padding:0.4rem 0.8rem;" onclick="submitComment('${issue.id}')">Post</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleLike(id) {
    const issue = cityIssues.find(i => i.id === id);
    if (issue) {
        issue.likes += 1;
        renderPublicIssues();
    }
}

function toggleComments(id) {
    const box = document.getElementById(`comments-${id}`);
    if (box) box.classList.toggle('open');
}

function submitComment(id) {
    const input = document.getElementById(`comment-input-${id}`);
    const text = input.value.trim();
    if (text) {
        const issue = cityIssues.find(i => i.id === id);
        issue.comments.push({ user: currentUser ? currentUser.email : "Citizen", text });
        renderPublicIssues();
    }
}

// TELEMETRY INSPECTOR
function inspectSector(name, hazard, status, telemetry, co2, grid) {
    document.getElementById('secTitle').textContent = name;
    document.getElementById('secIssue').textContent = hazard;
    document.getElementById('secStatus').textContent = status;
    document.getElementById('secLoad').textContent = telemetry;
    document.getElementById('secAqi').textContent = co2;
}

// MESH SIMULATOR
function simulateMeshBroadcast() {
    const log = document.getElementById('meshLogBox');
    const nodes = [document.getElementById('mn1'), document.getElementById('mn2'), document.getElementById('mn3'), document.getElementById('mn4')];
    
    nodes.forEach(n => n.classList.remove('active'));
    nodes[0].classList.add('active');
    log.innerHTML = `> [0.0s] Initiating Emergency Packet Broadcast...<br>`;

    setTimeout(() => { nodes[1].classList.add('active'); log.innerHTML += `> [0.5s] Hop 1 BLE Handshake Confirmed...<br>`; }, 500);
    setTimeout(() => { nodes[2].classList.add('active'); log.innerHTML += `> [1.1s] Hop 2 Relay via Municipal Smart Pole #108...<br>`; }, 1100);
    setTimeout(() => { nodes[3].classList.add('active'); log.innerHTML += `> [1.8s] Packet Received. 100% Reachability Achieved.<br>`; }, 1800);
}

// STRESS ANALYTICS CHART
function initStressChart() {
    const ctx = document.getElementById('stressChart').getContext('2d');
    stressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [
                { label: 'Drainage Hazard Level', data: [20, 25, 40, 50, 45, 30], borderColor: '#00e5ff', tension: 0.4 },
                { label: 'Power Grid Stress', data: [45, 40, 65, 80, 75, 60], borderColor: '#f59e0b', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateStressChart() {
    const r = parseInt(document.getElementById('rainSlider').value);
    const t = parseInt(document.getElementById('trafficSlider').value);
    const g = parseInt(document.getElementById('gridSlider').value);

    document.getElementById('rainVal').textContent = r;
    document.getElementById('trafficVal').textContent = t;
    document.getElementById('gridVal').textContent = g;

    if (stressChartInstance) {
        stressChartInstance.data.datasets[0].data = [r*0.4, r*0.7, r*1.1, r*1.3, r*0.9, r*0.5];
        stressChartInstance.data.datasets[1].data = [t*0.5, t*0.8, g*1.1, g*1.3, g*1.0, t*0.6];
        stressChartInstance.update();
    }
}

// OWNER EXCLUSIVE TABLE
function renderOwnerTable() {
    const tbody = document.getElementById('ownerReportTableBody');
    if (!tbody) return;
    tbody.innerHTML = cityIssues.map(issue => `
        <tr>
            <td>${issue.id}</td>
            <td>${escapeHtml(issue.category)}</td>
            <td>${escapeHtml(issue.location)}</td>
            <td style="color:var(--accent-amber);">${escapeHtml(issue.reporter)}</td>
            <td><img src="${issue.photo || 'https://via.placeholder.com/40'}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;"></td>
            <td><button class="btn btn-cyan" style="padding:0.2rem 0.5rem; font-size:0.72rem;" onclick="resolveIssue('${issue.id}')">Resolve</button></td>
        </tr>
    `).join('');
}

function resolveIssue(id) {
    const issue = cityIssues.find(i => i.id === id);
    if (issue) {
        issue.status = "Resolved";
        renderPublicIssues();
        renderOwnerTable();
    }
}

// AUTH & PRIVACY LOGIC
function openAuthModal() { document.getElementById('authModal').classList.add('active'); }
function closeAuthModal() { document.getElementById('authModal').classList.remove('active'); }
function openPitchModal() { document.getElementById('pitchModal').classList.add('active'); }
function closePitchModal() { document.getElementById('pitchModal').classList.remove('active'); }

function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    currentUser = { email, role: email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'owner' : 'user' };
    localStorage.setItem('nagrikone_user', JSON.stringify(currentUser));
    updateUIForUser();
    closeAuthModal();
}

function checkStoredUserSession() {
    const saved = localStorage.getItem('nagrikone_user');
    if (saved) { currentUser = JSON.parse(saved); updateUIForUser(); }
}

function updateUIForUser() {
    const container = document.getElementById('authContainer');
    const ownerTab = document.getElementById('ownerTabBtn');
    if (currentUser) {
        const isOwner = currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
        container.innerHTML = `<button class="btn btn-outline" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>`;
        ownerTab.style.display = isOwner ? "flex" : "none";
        if (isOwner) renderOwnerTable();
    } else {
        container.innerHTML = `<button class="btn btn-cyan" onclick="openAuthModal()"><i class="fa-solid fa-right-to-bracket"></i> Login / Register</button>`;
        ownerTab.style.display = "none";
    }
}

function handleLogout() {
    localStorage.removeItem('nagrikone_user');
    currentUser = null;
    updateUIForUser();
    switchTab('tab-dashboard');
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ===================== GLOBAL VARIABLES =====================
let pollEndTime;
let updateTimer;

// ===================== GLOBAL INIT =====================
document.addEventListener("DOMContentLoaded", () => {
    initAccordion();
    initScrollToTop();
    initFadeInSections();
    initPoll();
    initAdminUI();
    console.log("All inits ran successfully");
});

// ===================== 1. ACCORDION =====================
function initAccordion() {
    const accordion = document.getElementById("accordionMenu");
    const button = document.querySelector(".toggle-accordion-btn");
    if (!accordion || !button) return;

    button.addEventListener("click", () => {
        accordion.classList.toggle("show");
        button.textContent = accordion.classList.contains("show") ? "Hide socials" : "Show socials";

        if (!accordion.classList.contains("show")) {
            document.querySelectorAll('.accordion-item').forEach(item => item.classList.remove('active'));
        }
    });

    document.querySelectorAll('.accordion-item').forEach(item => {
        const btn = item.querySelector('.accordion-button');
        btn.addEventListener('click', () => item.classList.toggle('active'));
    });
}

// ===================== 2. SCROLL TO TOP =====================
function initScrollToTop() {
    let button = document.createElement("button");
    button.id = "scrollTopBtn";
    button.textContent = "↑ Top";
    button.style.cssText = `
        position:fixed;
        bottom:20px;
        right:20px;
        padding:10px 15px;
        border:none;
        border-radius:5px;
        background:#6F6DE8;
        color:white;
        cursor:pointer;
        display:none;
        font-weight:bold;
    `;
    document.body.appendChild(button);

    window.addEventListener("scroll", () => {
        button.style.display = window.scrollY > 300 ? "block" : "none";
    });

    button.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: "smooth" })
    );
}

// ===================== 3. FADE-IN SECTIONS =====================
function initFadeInSections() {
    const sections = document.querySelectorAll("section");
    if (!sections.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add("visible");
        });
    }, { threshold: 0.2 });

    sections.forEach(sec => observer.observe(sec));
}

// ===================== 5. POLL SYSTEM =====================
function initPoll() {
    let votes = JSON.parse(localStorage.getItem("pollVotes") || '{"Minecraft":0,"Modded Minecraft":0}');
    pollEndTime = Number(localStorage.getItem("pollEndTime")) || (Date.now() + 24*60*60*1000);

    const minecraftSpan = document.getElementById("minecraftVotes");
    const moddedSpan = document.getElementById("moddedVotes");

    function updateResults() {
        minecraftSpan.textContent = votes["Minecraft"];
        moddedSpan.textContent = votes["Modded Minecraft"];
    }

    updateTimer = function() {
        const timerElement = document.getElementById("voteTimer");
        let left = Math.max(0, Math.floor((pollEndTime - Date.now()) / 1000));
        let min = Math.floor(left/60);
        let sec = (left%60).toString().padStart(2,"0");
        timerElement.textContent = `Time left: ${min}:${sec}`;

        if(left <=0) {
            document.querySelectorAll("#poll button[data-choice]").forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            });
        }
    };

    function showMessage(text) {
        const msg = document.getElementById("voteMessage");
        document.getElementById("voteMessageText").textContent = text;
        msg.style.display = "block";
    }

    window.closeVoteMessage = function() {
        document.getElementById("voteMessage").style.display = "none";
    };

    document.querySelectorAll("#poll button[data-choice]").forEach(btn => {
        btn.addEventListener("click", () => {
            // check localStorage bij elke klik
            let hasVoted = localStorage.getItem("voted") === "yes";
            if (hasVoted) {
                showMessage("You already voted!");
                return;
            }

            const choice = btn.getAttribute("data-choice");
            votes[choice]++;
            localStorage.setItem("pollVotes", JSON.stringify(votes));
            localStorage.setItem("voted", "yes");
            updateResults();
            showMessage("Thanks for voting!");
        });
    });

    function startTimer() {
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    startTimer();

    // ================== ADMIN FUNCTIONS ==================
    window.resetPollVotes = function() {
        votes = {"Minecraft":0,"Modded Minecraft":0};
        localStorage.setItem("pollVotes", JSON.stringify(votes));
        localStorage.removeItem("voted");
        updateResults();
        showMessage("Votes reset!");
    };

    window.resetPollTimer = function() {
        pollEndTime = Date.now() + 24*60*60*1000; // nieuwe 24h
        localStorage.setItem("pollEndTime", pollEndTime);
        updateTimer(); // direct updaten
        showMessage("Timer reset!");
    };
}

// ===================== 6. ADMIN UI =====================
function initAdminUI() {
    const adminBtn = document.getElementById("adminBtn");
    const adminLogin = document.getElementById("adminLogin");
    const adminPanel = document.getElementById("adminPanel");
    const passwordInput = document.getElementById("adminPassword");
    const loginBtn = adminLogin.querySelector("button");

    const ADMIN_PASSWORD = "1804"; // pas hier aan

    adminBtn.addEventListener("click", () => adminLogin.style.display="block");
    window.closeAdminLogin = () => adminLogin.style.display="none";
    window.closeAdminPanel = () => adminPanel.style.display="none";

    loginBtn.addEventListener("click", checkAdminPassword);
    passwordInput.addEventListener("keyup", (e) => {
        if(e.key === "Enter") checkAdminPassword();
    });

    function checkAdminPassword() {
        if(passwordInput.value === ADMIN_PASSWORD) {
            adminLogin.style.display="none";
            adminPanel.style.display="block";
            passwordInput.value="";
            console.log("Admin UI initialized");
        } else {
            alert("Incorrect password!");
        }
    }
}
// ===================== SNOW =====================
function initSnow() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 0;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let flakes = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
        flakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2,
            drift: Math.random() * 0.4 - 0.2,
            opacity: Math.random() * 0.4 + 0.1
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        flakes.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
            ctx.fill();

            f.y += f.speed;
            f.x += f.drift;

            if (f.y > canvas.height) {
                f.y = -5;
                f.x = Math.random() * canvas.width;
            }
            if (f.x > canvas.width) f.x = 0;
            if (f.x < 0) f.x = canvas.width;
        });
        requestAnimationFrame(draw);
    }
    draw();
}

initSnow();

// ===================== STICKY NOTE ROTATION =====================
function initStickyRotation() {
    const sections = document.querySelectorAll("section");
    sections.forEach(sec => {
        const rotation = (Math.random() * 6 - 3).toFixed(2); // tussen -2 en +2 graden
        sec.style.transform = `rotate(${rotation}deg)`;
    });
}

initStickyRotation();
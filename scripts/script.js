// ===================== GLOBAL VARIABLES =====================
let pollEndTime;
let updateTimer;

// ===================== GLOBAL INIT =====================
document.addEventListener("DOMContentLoaded", () => {
    initAccordion();
    initScrollToTop();
    initFadeInSections();
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

    let lastScrollY = window.scrollY;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const scrollingDown = window.scrollY >= lastScrollY;

            if (entry.isIntersecting) {
                entry.target.style.transform = "translateY(0)";
                entry.target.style.opacity = "1";
            } else {
                if (scrollingDown) {
                    entry.target.style.transform = "translateY(-30px)";
                } else {
                    entry.target.style.transform = "translateY(30px)";
                }
                entry.target.style.opacity = "0";
            }

            lastScrollY = window.scrollY;
        });
    }, { threshold: 0.35 });

    sections.forEach(sec => observer.observe(sec));
}
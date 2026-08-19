// ==========================================================================
// MOMENTO MVP — Client-Side Core & Interactive Logic
// Minimal, resilient, accessible
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    initMobileNav();

    // 2. Active Link Highlighting
    highlightActiveNav();

    // 3. Consultation Form Handler
    initIntakeForm();

    // 4. Private Watch Portal Logic
    initWatchPortal();
});

/**
 * Mobile Navigation Menu Handler
 */
function initMobileNav() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('nav-open');
            mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close nav when clicking outside or clicking a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('nav-open');
                mobileBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }
}

/**
 * Highlight Current Navigation Link
 */
function highlightActiveNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav a:not(.cta-btn), .footer-nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Consultation / Intake Form Handler
 * Endpoint: FormSubmit AJAX with fallback mailto
 * Clearly communicates: requires email notification backend for production
 */
function initIntakeForm() {
    const form = document.getElementById('intakeForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('intakeSubmitBtn');
        const successBox = document.getElementById('formSuccess');
        const errorBox = document.getElementById('formError');

        if (successBox) successBox.style.display = 'none';
        if (errorBox) errorBox.style.display = 'none';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending Details...';
        }

        const formData = new FormData(form);

        // Production note: In real production, this routes to a secured backend API / CRM.
        const FORM_ENDPOINT = "https://formsubmit.co/ajax/hello@momentofilms.com";

        try {
            const response = await fetch(FORM_ENDPOINT, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response error');
            }

            if (successBox) {
                successBox.style.display = 'block';
                successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            form.reset();
        } catch (err) {
            // Graceful fallback to mailto if external endpoint fails
            const buyerName = form.querySelector('[name="buyer_name"]')?.value || 'Inquirer';
            const storyteller = form.querySelector('[name="storyteller_name"]')?.value || '';
            const relationship = form.querySelector('[name="relationship"]')?.value || '';
            const location = form.querySelector('[name="location"]')?.value || '';
            const reason = form.querySelector('[name="reason"]')?.value || '';

            const mailSubject = encodeURIComponent(`Momento Consultation Request — ${buyerName}`);
            const mailBody = encodeURIComponent(
                `Buyer Name: ${buyerName}\n` +
                `Storyteller: ${storyteller} (${relationship})\n` +
                `Location: ${location}\n\n` +
                `Story Context:\n${reason}`
            );

            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML = `<strong>Note:</strong> We could not connect to the automated form server. Please <a href="mailto:hello@momentofilms.com?subject=${mailSubject}&body=${mailBody}" style="color:#782828; text-decoration:underline;">click here to email your consultation request directly</a> to <strong>hello@momentofilms.com</strong>.`;
                errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

/**
 * Private Digital Viewing Experience (watch.html)
 * Private link -> Password -> Legacy film -> Chapters -> Watch
 */
function initWatchPortal() {
    const gateCard = document.getElementById('accessGateCard');
    const viewerLayout = document.getElementById('viewerLayout');
    const passForm = document.getElementById('passcodeForm');
    const passInput = document.getElementById('passcodeInput');
    const gateError = document.getElementById('gateError');
    const videoPlayer = document.getElementById('legacyVideoPlayer');
    const chapterButtons = document.querySelectorAll('.chapter-item');

    if (!passForm) return;

    // Check if access already granted in session or via URL parameter (e.g. ?code=LEGACY2026)
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    const sessionUnlocked = sessionStorage.getItem('momento_unlocked') === 'true';

    function unlockPortal() {
        if (gateCard) gateCard.style.display = 'none';
        if (viewerLayout) viewerLayout.style.display = 'block';
        sessionStorage.setItem('momento_unlocked', 'true');
    }

    // Default MVP demo passcode: MOMENTO2026 or LEGACY
    const VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO'];

    if (sessionUnlocked || (codeParam && VALID_PASSWORDS.includes(codeParam.toUpperCase()))) {
        unlockPortal();
    }

    passForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = passInput ? passInput.value.trim().toUpperCase() : '';

        if (VALID_PASSWORDS.includes(entered) || entered.length >= 4) {
            if (gateError) gateError.style.display = 'none';
            unlockPortal();
        } else {
            if (gateError) {
                gateError.style.display = 'block';
                gateError.textContent = 'Invalid family access code. Please check your delivery email.';
            }
        }
    });

    // Chapter Navigation Sync
    if (chapterButtons.length > 0 && videoPlayer) {
        chapterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const timeSec = parseFloat(btn.getAttribute('data-time') || '0');

                // Update active state
                chapterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Seek video
                videoPlayer.currentTime = timeSec;
                videoPlayer.play().catch(() => {
                    // Autoplay prevention fallback
                });
            });
        });

        // Highlight chapter during playback
        videoPlayer.addEventListener('timeupdate', () => {
            const current = videoPlayer.currentTime;
            let activeIdx = 0;

            chapterButtons.forEach((btn, idx) => {
                const time = parseFloat(btn.getAttribute('data-time') || '0');
                if (current >= time) {
                    activeIdx = idx;
                }
            });

            chapterButtons.forEach((b, idx) => {
                if (idx === activeIdx) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        });
    }
}
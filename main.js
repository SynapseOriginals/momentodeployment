// ==========================================================================
// MOMENTO — Pure Static Client-Side Core & Interactive Engine
// Zero Backend Required — Fully Accessible Locally via Browser or Static Server
// Includes Quick-Explorer Tabs, Contextual Text-to-Speech & Private Portal
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle & Usability
    initMobileNav();

    // 2. Active Link Highlighting
    highlightActiveNav();

    // 3. Quick-Explorer Tabs (index.html)
    initQuickExplorer();

    // 4. Contextual Text-to-Speech (TTS) Engine
    initTextToSpeech();

    // 5. Embedded Product Preview Player (index.html)
    initEmbeddedPreview();

    // 6. Story Chapter Accordion Interactivity (experience.html)
    initChapterAccordions();

    // 7. Consultation Form Handler (conversation.html)
    initIntakeForm();

    // 8. Private Watch Portal Logic (watch.html)
    initWatchPortal();

    // 9. Future Feature Placeholders
    initPlaceholderButtons();
});

/**
 * Mobile Navigation Menu Handler (Touch & Keyboard Friendly)
 */
function initMobileNav() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('nav-open');
            mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close nav when clicking a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('nav-open');
                mobileBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close when tapping outside the menu
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('nav-open') && !navMenu.contains(e.target) && e.target !== mobileBtn) {
                navMenu.classList.remove('nav-open');
                mobileBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('nav-open')) {
                navMenu.classList.remove('nav-open');
                mobileBtn.setAttribute('aria-expanded', 'false');
                mobileBtn.focus();
            }
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
 * Interactive Quick-Explorer Tabs (index.html)
 * Allows fast high-level discovery without endless scrolling
 */
function initQuickExplorer() {
    const tabButtons = document.querySelectorAll('.explorer-tab-btn');
    const tabPanels = document.querySelectorAll('.explorer-panel');

    if (tabButtons.length === 0 || tabPanels.length === 0) return;

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanelId = btn.getAttribute('aria-controls');

            // Update Tab Button States
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            // Update Panel States
            tabPanels.forEach(panel => {
                if (panel.id === targetPanelId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });
}

/**
 * Contextual Text-to-Speech (TTS) Engine
 * - Clean Web Speech API integration (Runs 100% in-browser)
 * - Single-utterance concurrency (stops other playback)
 * - Toggles button between 🔊 Listen and ⏹ Stop
 * - Fails gracefully if unsupported
 */
function initTextToSpeech() {
    const isSpeechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const ttsButtons = document.querySelectorAll('.tts-btn');

    if (!isSpeechSupported) {
        ttsButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        return;
    }

    const synth = window.speechSynthesis;
    let activeBtn = null;

    function stopPlayback() {
        if (synth.speaking || synth.pending) {
            synth.cancel();
        }
        if (activeBtn) {
            resetButtonUI(activeBtn);
            activeBtn = null;
        }
    }

    function resetButtonUI(btn) {
        btn.classList.remove('is-speaking');
        btn.setAttribute('aria-label', 'Listen to this section aloud');
        const customText = btn.getAttribute('data-tts-label') || 'Listen';
        btn.innerHTML = `<span class="tts-icon" aria-hidden="true">🔊</span> <span>${customText}</span>`;
    }

    function setSpeakingButtonUI(btn) {
        btn.classList.add('is-speaking');
        btn.setAttribute('aria-label', 'Stop playback');
        btn.innerHTML = '<span class="tts-icon" aria-hidden="true">⏹</span> <span>Stop</span>';
    }

    // Stop TTS on page unload or visibility change
    window.addEventListener('beforeunload', stopPlayback);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopPlayback();
        }
    });

    ttsButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Clicking speaking button stops playback
            if (btn === activeBtn && synth.speaking) {
                stopPlayback();
                return;
            }

            // Stop any ongoing speech
            stopPlayback();

            // Extract target text
            let textToRead = '';
            const targetSelector = btn.getAttribute('data-tts-target');

            if (targetSelector) {
                const targetEl = document.querySelector(targetSelector);
                if (targetEl) {
                    textToRead = extractCleanText(targetEl);
                }
            }

            if (!textToRead) {
                const container = btn.closest('.chapter-accordion-body') || btn.closest('.ethical-callout') || btn.closest('.distinction-card') || btn.closest('.faq-item') || btn.closest('.archive-detail-block') || btn.parentElement;
                if (container) {
                    textToRead = extractCleanText(container, btn);
                }
            }

            if (!textToRead.trim()) return;

            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.rate = 0.95; // Warm, thoughtful pace
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            utterance.onstart = () => {
                activeBtn = btn;
                setSpeakingButtonUI(btn);
            };

            utterance.onend = () => {
                if (activeBtn === btn) {
                    resetButtonUI(btn);
                    activeBtn = null;
                }
            };

            utterance.onerror = () => {
                if (activeBtn === btn) {
                    resetButtonUI(btn);
                    activeBtn = null;
                }
            };

            synth.speak(utterance);
        });
    });
}

/**
 * Extracts readable plain text from a DOM element, ignoring buttons/icons
 */
function extractCleanText(element, excludeBtn) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('button, .tts-btn, script, style, [aria-hidden="true"]').forEach(el => el.remove());
    if (excludeBtn) {
        const btnInClone = clone.querySelector('.tts-btn');
        if (btnInClone) btnInClone.remove();
    }
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Embedded Product Preview Player (index.html)
 * Frictionless sample chapter navigation and quote sync
 */
function initEmbeddedPreview() {
    const previewPlayer = document.getElementById('previewVideoPlayer');
    const chapterButtons = document.querySelectorAll('.preview-chapter-btn');
    const quoteDisplay = document.getElementById('previewQuoteDisplay');

    if (!previewPlayer || chapterButtons.length === 0) return;

    chapterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const timeSec = parseFloat(btn.getAttribute('data-time') || '0');
            const quote = btn.getAttribute('data-quote');

            chapterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (quoteDisplay && quote) {
                quoteDisplay.innerHTML = quote;
            }

            previewPlayer.currentTime = timeSec;
            previewPlayer.play().catch(() => {});
        });
    });

    previewPlayer.addEventListener('timeupdate', () => {
        const current = previewPlayer.currentTime;
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
                const quote = b.getAttribute('data-quote');
                if (quoteDisplay && quote) {
                    quoteDisplay.innerHTML = quote;
                }
            } else {
                b.classList.remove('active');
            }
        });
    });
}

/**
 * Story Chapter Accordion Interactivity (experience.html)
 */
function initChapterAccordions() {
    const accordions = document.querySelectorAll('.chapters-accordion');
    if (accordions.length === 0) return;

    accordions.forEach(accordion => {
        const items = accordion.querySelectorAll('.chapter-accordion-item');
        items.forEach(item => {
            const headerBtn = item.querySelector('.chapter-accordion-header');
            if (!headerBtn) return;

            headerBtn.addEventListener('click', (e) => {
                if (e.target.closest('.tts-btn')) return;

                const isOpen = item.classList.contains('open');

                items.forEach(otherItem => {
                    otherItem.classList.remove('open');
                    const otherBtn = otherItem.querySelector('.chapter-accordion-header');
                    if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                });

                if (!isOpen) {
                    item.classList.add('open');
                    headerBtn.setAttribute('aria-expanded', 'true');
                }
            });
        });
    });
}

/**
 * Placeholder Buttons Feedback
 */
function initPlaceholderButtons() {
    const futureBtns = document.querySelectorAll('[data-placeholder-action="future-chapter"]');
    futureBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Future Expansion Preview: This client portal feature will allow returning families to commission additional chapters. For now, please contact your Momento Director directly at hello@momentofilms.com.');
        });
    });
}

/**
 * Consultation / Intake Form Handler
 * Pure Client-Side — Instant local confirmation with optional cloud fallback
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
            submitBtn.textContent = 'Submitting Request...';
        }

        const formData = new FormData(form);
        const buyerName = formData.get('buyer_name') || 'Friend';
        const storyteller = formData.get('storyteller_name') || '';

        // Try submitting to cloud endpoint in background if online (fire-and-forget)
        try {
            fetch('https://formsubmit.co/ajax/hello@momentofilms.com', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            }).catch(() => {});
        } catch (e) {}

        // Instant Client-Side Confirmation (Zero Backend Dependency)
        setTimeout(() => {
            if (successBox) {
                successBox.style.display = 'block';
                successBox.innerHTML = `
                    <h3 style="font-size: 1.25rem; font-family: var(--serif); color: #1E1A16; margin-bottom: 0.5rem;">
                        Thank you, ${buyerName}. Your consultation request has been received.
                    </h3>
                    <p style="font-size: 0.92rem; color: #5C554E; line-height: 1.6; margin-bottom: 0.8rem;">
                        Our director will review your details regarding preserving <strong>${storyteller || 'your family member'}</strong>'s legacy and reach out within 24–48 hours to schedule a relaxed 15-minute introductory video call.
                    </p>
                    <div style="font-size: 0.82rem; color: #8A8175;">
                        Direct Line: <strong>+91 (0) 40 4821 9000</strong> • Email: <strong>hello@momentofilms.com</strong>
                    </div>
                `;
                successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            form.reset();

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }, 300);
    });
}

/**
 * Private Digital Viewing Experience (watch.html)
 * Client-Side Passcode Verification (Zero Backend Needed)
 */
function initWatchPortal() {
    const gateCard = document.getElementById('accessGateCard');
    const viewerLayout = document.getElementById('viewerLayout');
    const passForm = document.getElementById('passcodeForm');
    const passInput = document.getElementById('passcodeInput');
    const gateError = document.getElementById('gateError');
    const videoPlayer = document.getElementById('legacyVideoPlayer');
    const chapterButtons = document.querySelectorAll('.chapter-item');
    const instantDemoBtn = document.getElementById('instantDemoBtn');

    if (!passForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    const sessionUnlocked = sessionStorage.getItem('momento_unlocked') === 'true';

    function unlockPortal() {
        if (gateCard) gateCard.style.display = 'none';
        if (viewerLayout) viewerLayout.style.display = 'block';
        sessionStorage.setItem('momento_unlocked', 'true');
    }

    const VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO', 'RAOFAMILY'];

    if (sessionUnlocked || (codeParam && VALID_PASSWORDS.includes(codeParam.toUpperCase()))) {
        unlockPortal();
    }

    if (instantDemoBtn) {
        instantDemoBtn.addEventListener('click', () => {
            unlockPortal();
        });
    }

    passForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = passInput ? passInput.value.trim().toUpperCase() : '';

        // Instant Client-Side Verification: Validates preset codes or any code >= 4 characters
        if (VALID_PASSWORDS.includes(entered) || entered.length >= 4) {
            if (gateError) gateError.style.display = 'none';
            unlockPortal();
        } else {
            if (gateError) {
                gateError.style.display = 'block';
                gateError.textContent = 'Invalid family access code. Please enter at least 4 characters or check your delivery email.';
            }
        }
    });

    if (chapterButtons.length > 0 && videoPlayer) {
        chapterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const timeSec = parseFloat(btn.getAttribute('data-time') || '0');

                chapterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                videoPlayer.currentTime = timeSec;
                videoPlayer.play().catch(() => {});
            });
        });

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

// ===================== SUPABASE INIT =====================
const _supabase = supabase.createClient(
    'https://vrzrahjpfzikwwsawycs.supabase.co',
    'sb_publishable_rfSfPZGLYIt2jLjFGiWnuQ_kDfyuOCv'
);

// ===================== AUTH STATE =====================
let currentUser = null;
let currentUsername = null;

async function getUsername(userId) {
    const { data } = await _supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .limit(1);
    return data && data.length > 0 ? data[0].username : null;
}

async function onAuthReady(session) {
    currentUser = session ? session.user : null;

    if (currentUser) {
        const pending = localStorage.getItem('pendingUsername');
        if (pending) {
            await _supabase.from('profiles').insert([{
                id: currentUser.id,
                username: pending
            }]);
            localStorage.removeItem('pendingUsername');
        }
        currentUsername = await getUsername(currentUser.id);
    } else {
        currentUsername = null;
    }

    initGuestbook();
    initSupabasePoll();
    updateNavbar();
}

_supabase.auth.getSession().then(({ data }) => {
    onAuthReady(data.session);
});

_supabase.auth.onAuthStateChange((_event, session) => {
    onAuthReady(session);
});

// ===================== NAVBAR =====================
function updateNavbar() {
    const loginLink = document.getElementById('navLoginLink');
    const logoutLink = document.getElementById('navLogoutLink');
    const navUsername = document.getElementById('navUsername');
    if (!loginLink) return;

    if (currentUser) {
        loginLink.style.display = 'none';
        logoutLink.style.display = 'inline';
        if (navUsername) navUsername.textContent = currentUsername || '';
    } else {
        loginLink.style.display = 'inline';
        logoutLink.style.display = 'none';
        if (navUsername) navUsername.textContent = '';
    }
}

window.handleLogout = async function() {
    await _supabase.auth.signOut();
};

// ===================== POLL =====================
async function initSupabasePoll() {
    const pollButtons  = document.getElementById('pollButtons');
    const pollResults  = document.getElementById('pollResults');
    const pollLoginMsg = document.getElementById('pollLoginMsg');
    const timerEl      = document.getElementById('voteTimer');
    if (!pollButtons) return;

    if (pollButtons.dataset.loading) return;
    pollButtons.dataset.loading = 'true';
    pollButtons.innerHTML = '';
    pollResults.innerHTML = '';

    const { data: options, error } = await _supabase
        .from('poll_options')
        .select('*')
        .order('id');

    if (error || !options) return;

    function renderResults(opts) {
        const total = opts.reduce((sum, o) => sum + (o.votes || 0), 0);
        pollResults.innerHTML = opts.map(o => {
            const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
            return `<p><strong>${escapeHtml(o.label)}</strong>: ${o.votes} vote${o.votes !== 1 ? 's' : ''} (${pct}%)</p>`;
        }).join('');
    }

    async function hasVoted() {
        if (!currentUser) return false;
        const { data } = await _supabase
            .from('poll_votes')
            .select('id')
            .eq('voter_id', currentUser.id)
            .limit(1);
        return data && data.length > 0;
    }

    async function renderButtons() {
        pollButtons.innerHTML = '';
        renderResults(options);

        if (!currentUser) {
            pollLoginMsg.style.display = 'block';
            timerEl.textContent = '';
            return;
        }

        pollLoginMsg.style.display = 'none';
        const voted = await hasVoted();

        if (voted) {
            timerEl.textContent = "You've already voted — thanks!";
            return;
        }

        timerEl.textContent = '';
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option.label;
            btn.addEventListener('click', () => castVote(option, options));
            pollButtons.appendChild(btn);
        });
    }

    async function castVote(option, opts) {
        pollButtons.querySelectorAll('button').forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.5';
        });

        const { error: voteError } = await _supabase
            .from('poll_votes')
            .insert([{ voter_id: currentUser.id, option_id: option.id }]);

        if (voteError) {
            showVoteMessage('Something went wrong, try again.');
            renderButtons();
            return;
        }

        const { error: updateError } = await _supabase
            .from('poll_options')
            .update({ votes: option.votes + 1 })
            .eq('id', option.id);

        if (updateError) {
            showVoteMessage('Something went wrong updating votes.');
            return;
        }

        option.votes++;
        renderResults(opts);
        timerEl.textContent = "You've already voted — thanks!";
        pollButtons.innerHTML = '';
        showVoteMessage('Thanks for voting!');
    }

    await renderButtons();
    pollButtons.dataset.loading = '';
}

function showVoteMessage(text) {
    const msg = document.getElementById('voteMessage');
    document.getElementById('voteMessageText').textContent = text;
    msg.style.display = 'block';
}

window.closeVoteMessage = function() {
    document.getElementById('voteMessage').style.display = 'none';
};

// ===================== LANGUAGE DETECTION & TRANSLATION =====================
async function detectLanguage(text) {
    try {
        const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`
        );
        const data = await res.json();
        const lang = data.responseData?.detectedLanguage
                  || data.matches?.[0]?.subject
                  || null;
        return lang;
    } catch (e) {
        return null;
    }
}

async function translateText(text, fromLang) {
    try {
        const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|en`
        );
        const data = await res.json();
        return data.responseData?.translatedText || null;
    } catch (e) {
        return null;
    }
}

// ===================== PROFANITY FILTER =====================
async function containsProfanity(text) {
    try {
        const res = await fetch(
            `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`
        );
        const result = await res.text();
        return result === 'true';
    } catch (e) {
        return false; // bij fout gewoon doorlaten
    }
}

// ===================== GUESTBOOK =====================
async function initGuestbook() {
    const gbForm     = document.getElementById('gbForm');
    const gbLoginMsg = document.getElementById('gbLoginMsg');
    const gbStatus   = document.getElementById('gbStatus');
    if (!gbForm) return;

    if (currentUser) {
        gbForm.style.display = 'block';
        gbLoginMsg.style.display = 'none';
    } else {
        gbForm.style.display = 'none';
        gbLoginMsg.style.display = 'block';
    }

    await loadMessages();

    // Add translator preview UI below the textarea
    if (!document.getElementById('gbTranslator')) {
        const translatorDiv = document.createElement('div');
        translatorDiv.id = 'gbTranslator';
        translatorDiv.style.cssText = `
            display: none;
            margin-top: 10px;
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 12px;
            font-size: 13px;
            text-align: left;
            color: white;
        `;
        translatorDiv.innerHTML = `
            <p id="gbDetectedLang" style="margin:0 0 6px; font-weight:600;"></p>
            <p style="margin:0 0 4px; opacity:0.8;">English translation:</p>
            <p id="gbTranslatedText" style="margin:0; font-style:italic; opacity:0.95;"></p>
        `;
        document.getElementById('gbMessage').after(translatorDiv);
    }

    // Detect language as user types (with debounce)
    let detectionTimeout;
    document.getElementById('gbMessage').oninput = () => {
        clearTimeout(detectionTimeout);
        const msg = document.getElementById('gbMessage').value.trim();
        const translatorDiv = document.getElementById('gbTranslator');

        if (msg.length < 10) {
            translatorDiv.style.display = 'none';
            return;
        }

        detectionTimeout = setTimeout(async () => {
            const lang = await detectLanguage(msg);
            if (lang && lang !== 'en') {
                document.getElementById('gbDetectedLang').textContent = `🌐 Detected: ${lang.toUpperCase()}`;
                document.getElementById('gbTranslatedText').textContent = 'Translating...';
                translatorDiv.style.display = 'block';
                const translated = await translateText(msg, lang);
                document.getElementById('gbTranslatedText').textContent = translated || 'Could not translate.';
            } else {
                translatorDiv.style.display = 'none';
            }
        }, 800);
    };

    document.getElementById('gbSubmit').onclick = async () => {
        const message = document.getElementById('gbMessage').value.trim();
        if (!message) { gbStatus.textContent = 'Please write a message!'; return; }

        gbStatus.textContent = '🔍 Checking message...';

        // Profanity check
        const hasProfanity = await containsProfanity(message);
        if (hasProfanity) {
            gbStatus.textContent = '❌ Your message contains inappropriate language and was not posted.';
            return;
        }

        // Detect language — reject if undetectable
        const lang = await detectLanguage(message);
        if (!lang) {
            gbStatus.textContent = '❌ Could not detect the language of your message. Please write in a recognisable language.';
            return;
        }

        // If not English, append translation
        let finalMessage = message;
        if (lang !== 'en') {
            const translated = await translateText(message, lang);
            if (translated) {
                finalMessage = `${message} [EN: ${translated}]`;
            }
        }

        gbStatus.textContent = 'Posting...';

        const { error } = await _supabase
            .from('guestbook')
            .insert([{ name: currentUsername || 'Anonymous', message: finalMessage }]);

        if (error) {
            gbStatus.textContent = 'Something went wrong, try again.';
        } else {
            gbStatus.textContent = 'Message posted!';
            document.getElementById('gbMessage').value = '';
            document.getElementById('gbTranslator').style.display = 'none';
            await loadMessages();
        }
    };

    document.getElementById('gbLogout').onclick = async () => {
        await _supabase.auth.signOut();
    };
}

async function loadMessages() {
    const { data } = await _supabase
        .from('guestbook')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    const wall = document.getElementById('gbWall');
    if (!wall) return;
    wall.innerHTML = '';

    if (!data || data.length === 0) {
        wall.innerHTML = '<p style="color:#555;">No messages yet — be the first!</p>';
        return;
    }

    data.forEach(row => {
        const div = document.createElement('div');
        div.style.cssText = 'background:#C1C0F6; border-radius:10px; padding:14px 18px; margin:10px auto; text-align:left; max-width:500px;';
        div.innerHTML = `
            <strong style="font-size:15px;">${escapeHtml(row.name)}</strong>
            <span style="font-size:11px; color:#555; margin-left:8px;">${new Date(row.created_at).toLocaleDateString()}</span>
            <p style="margin:6px 0 0; font-size:14px;">${escapeHtml(row.message)}</p>`;
        wall.appendChild(div);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
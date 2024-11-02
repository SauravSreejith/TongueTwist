const serverUrl = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', () => {
    const usernameInfo = document.getElementById('usernameInfo');
    const authModal = document.getElementById('authModal');
    const signUpModal = document.getElementById('signUpModal');
    const logInModal = document.getElementById('logInModal');
    const messageContainer = document.getElementById('messageContainer');

    const storedUsername = localStorage.getItem('username');
    const storedPasswordHash = localStorage.getItem('passwordHash');

    if (storedUsername && storedPasswordHash) {
        fetch(`${serverUrl}/api/autologin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: storedUsername, passwordHash: storedPasswordHash })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                usernameInfo.innerText = storedUsername;
            } else {
                openModal(authModal);
            }
        });
    } else {
        openModal(authModal);
    }


    document.getElementById('openSignUpModal').addEventListener('click', () => {
        closeModal(authModal);
        openModal(signUpModal);
    });

    document.getElementById('openLogInModal').addEventListener('click', () => {
        closeModal(authModal);
        openModal(logInModal);
    });


    document.getElementById('signupButton').addEventListener('click', () => {
        const username = document.getElementById('signup-username-input').value;
        const password = document.getElementById('signup-password-input').value;

        fetch(`${serverUrl}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        }).then(res => res.json()).then(data => {
            if (data.valid) {
                alert("Username already exists.");
            } else {
                fetch(`${serverUrl}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                }).then(res => res.json()).then(data => {
                    if (data.hash) {
                        localStorage.setItem('username', username);
                        localStorage.setItem('passwordHash', data.hash);
                        closeAllModals();
                        usernameInfo.innerText = username;
                    }
                });
            }
        });
    });

    document.getElementById('loginButton').addEventListener('click', () => {
        const username = document.getElementById('login-username-input').value;
        const password = document.getElementById('login-password-input').value;

        fetch(`${serverUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.message === 'Login successful.') {
                localStorage.setItem('username', username);
                localStorage.setItem('passwordHash', data.hash);
                closeAllModals();
                usernameInfo.innerText = username;
            } else {
                alert("Invalid credentials.");
            }
        });
    });

    document.getElementById('userLogoutButton').addEventListener('click', () => {
        localStorage.removeItem('username');
        localStorage.removeItem('passwordHash');
        location.reload();
    });

    function createMessageCard(name, content) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-content">
                <article class="media">
                    <figure class="media-left">
                        <p class="image is-64x64">
                            <img src="https://api.dicebear.com/9.x/identicon/svg?seed=${name}" />
                        </p>
                    </figure>
                    <div class="media-content">
                        <div class="content">
                            <p>
                                <strong>${name}</strong>
                                <br />
                                ${content}
                            </p>
                        </div>
                    </div>
                </article>
            </div>
        `;
        messageContainer.appendChild(card);
    }

    document.getElementById('sendMessageButton').addEventListener('click', () => {
        const messageInput = document.getElementById('messageInput');
        const messageContent = messageInput.value;
        const username = localStorage.getItem('username');

        if (messageContent && username) {
            fetch(`${serverUrl}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, message: messageContent })
            }).then(res => res.json()).then(data => {
                createMessageCard(username, messageContent);
                messageInput.value = '';
            });
        }
    });

    function openModal(modal) {
        modal.classList.add('is-active');
    }

    function closeModal(modal) {
        modal.classList.remove('is-active');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.is-active').forEach(closeModal);
    }
});

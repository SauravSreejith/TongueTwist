const ws = new WebSocket('ws://tonguetwist-z3xr3jjg.b4a.run/');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

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
    autoScroll()
}

function autoScroll() {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.scrollTop = messageContainer.scrollHeight;
}


ws.onmessage = (event) => {
    const { username, message } = JSON.parse(event.data);
    createMessageCard(username, message);
};

function sendMessage(username, message) {
    const payload = JSON.stringify({ username, message });
    ws.send(payload);
}

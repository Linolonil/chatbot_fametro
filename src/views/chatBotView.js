import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export class ChatbotView {
    #config;
    #container = document.querySelector("#ewcb-widget");
    #header = document.querySelector(".ewcb-chat-header");
    #messages = document.querySelector("#ewcb-messages");
    #input = document.querySelector("#ewcb-input");
    #form = document.querySelector("#ewcb-form");
    #openBtn = document.querySelector("#ewcb-open-btn");
    #stopBtn = document.querySelector("#ewcb-stop");
    #closeBtn = document.querySelector("#ewcb-close-btn");
    #chatWin = document.querySelector("#ewcb-chat-window");
    #floatingIcon = document.querySelector("#ewcb-icon");
    #floatingIconBadge = document.querySelector(".ewcb-btn-badge");
    #initialStateContainer = document.querySelector("#ewcb-initial-state");
    #initAiBtn = document.querySelector("#ewcb-init-ai-btn");
    #progressContainer = document.querySelector("#ewcb-progress-container");
    #progressBar = document.querySelector("#ewcb-progress-bar");
    #progressLabel = document.querySelector("#ewcb-progress-label");
    #welcomeBubble = null;

    constructor(config) {
        this.#config = config;
        this.#applyTheme();
        this.#setHeader();
        this.#setFloatingIcon();
        this.setTypingDotDuration();
    }

setupEventHandlers({ onOpen, onSend, onStop, onInitAI }) {
        this.#openBtn.onclick = () => { this.openChat(); onOpen(); };
        this.#stopBtn.onclick = () => { onStop(); };
        this.#closeBtn.onclick = () => { this.closeChat(); };
        this.#initAiBtn.onclick = () => { onInitAI(); };
        this.#form.onsubmit = (e) => {
            e.preventDefault();
            const val = this.#input.value.trim();
            if (!val) return;
            this.appendUserMessage(val);
            this.clearInput();
            onSend(val);
        };
    }

     // Novo método para mostrar o estado de download
    showDownloadState() {
        this.#initialStateContainer.style.display = 'block';
        this.#initAiBtn.style.display = 'block';
        this.#progressContainer.style.display = 'none';
        this.setInputEnabled(false); // Garante que o input de texto esteja desabilitado
    }

    // Novo método para mostrar o progresso
    showProgress() {
        this.#initAiBtn.style.display = 'none';
        this.#progressContainer.style.display = 'block';
    }

    // Novo método para atualizar a barra de progresso
    updateProgress(progress) {
        const percent = Math.round(progress.progress * 100);
        this.#progressBar.value = percent;
        this.#progressLabel.textContent = `Baixando modelo... ${percent}%`;
    }

    // Novo método para esconder tudo e mostrar o chat normal
    hideInitialState() {
        this.#initialStateContainer.style.display = 'none';
    }

    setInputEnabled(enabled) {
        this.#input.disabled = !enabled;
        this.#form.querySelector("button[type=submit]").disabled = !enabled;
        this.#stopBtn.disabled = enabled;
    }

    openChat() {
        this.#chatWin.style.display = "flex";
        this.#floatingIconBadge.style.display = "none";
        setTimeout(() => this.focusInput(), 180);
        this.hideWelcomeBubble();
    }
    closeChat() { this.#chatWin.style.display = "none"; }

    renderWelcomeBubble() {
        this.#removeElement(this.#welcomeBubble);
        const bubble = document.createElement('div');
        bubble.className = 'ewcb-welcome-bubble';
        bubble.textContent = this.#config.welcomeBubble;
        bubble.onclick = () => {
            this.openChat();
        };
        document.body.appendChild(bubble);
        this.#welcomeBubble = bubble;
    }

    hideWelcomeBubble() {
        if (this.#welcomeBubble) this.#welcomeBubble.style.display = 'none';
    }

    /** CORE: Render bot message HTML, always via this helper */
    #renderBotMessageHTML(text, renderMarkdown = true) {
        return `
            <img src="${this.#config.botAvatar}" class="ewcb-avatar" alt="Bot Avatar" />
            <div class="ewcb-message-content">${renderMarkdown ? marked.parse(text) : text}</div>
        `;
    }

    appendBotMessage(text, element = null, renderMarkdown = true) {
        this.hideInitialState();

        const el = element || this.#createBotMessage();
        el.innerHTML = this.#renderBotMessageHTML(text, renderMarkdown);
        this.#append(el);
    }

    createStreamingBotMessage() {
        const element = this.#createBotMessage();
        this.#append(element);
        return element;
    }

    updateStreamingBotMessage(element, text, renderMarkdown = true) {
        element.innerHTML = this.#renderBotMessageHTML(text, renderMarkdown);
        this.#scrollToBottom();

    }

    #scrollToBottom() {
        this.#messages.scrollTop = this.#messages.scrollHeight;
    }

    appendUserMessage(text) {
        const msg = this.#createUserMessage(text);
        this.#append(msg);
    }

    #createBotMessage() {
        const msg = document.createElement('div');
        msg.className = 'ewcb-message ewcb-message-bot';
        return msg;
    }

    #createUserMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'ewcb-message ewcb-message-user';
        msg.innerHTML = `<div class="ewcb-message-content">${text}</div>`;
        return msg;
    }

    showTypingIndicator() {
        this.hideTypingIndicator()

        const indicator = document.createElement('div');
        indicator.className = 'ewcb-typing-indicator';
        indicator.innerHTML = `
            <span class="ewcb-typing-dot"></span>
            <span class="ewcb-typing-dot"></span>
            <span class="ewcb-typing-dot"></span>
        `;
        this.#append(indicator);
    }

    hideTypingIndicator() {
        this.#removeElement(this.#messages.querySelector('.ewcb-typing-indicator'));
    }

    clearInput() { this.#input.value = ''; }
    focusInput() { this.#input.focus(); }

    setTypingDotDuration() {
        const delayMs = Number(this.#config.typingDelay) || 1200;
        const durationSec = Math.max(0.6, delayMs / 1000 * 0.66);
        this.#container.style.setProperty('--typingDotDuration', `${durationSec}s`);
    }

    #append(msgNode) {
        this.#messages.appendChild(msgNode);
        this.#scrollToBottom();
    }

    #removeElement(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    #applyTheme() {
        Object.entries(this.#config).forEach(([k, v]) => {
            if (
                typeof v === "string" &&
                (k.endsWith('Color') || k.endsWith('Bubble') || k.endsWith('Text') || k === "buttonColor")
            ) {
                this.#container.style.setProperty(`--${k}`, v);
            }
        });
    }
    #setHeader() {
        this.#header.querySelector("#ewcb-header-icon").src = this.#config.iconUrl;
        this.#header.querySelector("#ewcb-chatbot-name").textContent = this.#config.chatbotName;
    }
    #setFloatingIcon() {
        this.#floatingIcon.src = this.#config.iconUrl;
    }
}

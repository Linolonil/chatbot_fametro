// @ts-check

/**
 * @typedef {import("../views/chatBotView.js").ChatbotView} ChatBotView
 */

// PASSO 1: Garantir que a classe PromptService está importada aqui.
import { PromptService } from '../services/promptService.js';

export class ChatbotController {
    #abortController;
    #chatbotView;
    #promptService;

    /**
    * @param {Object} deps - Dependencies for the class.
    * @param {ChatBotView} deps.chatbotView - The chatbot view instance.
    * @param {PromptService} deps.promptService - The prompt service instance.
    */
    constructor({ chatbotView, promptService }) {
        this.#chatbotView = chatbotView;
        this.#promptService = promptService;
    }

      async init({ firstBotMessage, text }) {
        this.systemPromptText = text;
        this.firstBotMessage = firstBotMessage;

        this.#setupEvents();
        this.#chatbotView.renderWelcomeBubble();

        const basicErrors = this.#checkRequirements();
        if (basicErrors.length) {
            this.#handleErrorState(basicErrors.join('\n\n'));
            return;
        }

        // VERIFICA SE JÁ INICIALIZAMOS A IA NESTA SESSÃO
        const isAiReadyInSession = sessionStorage.getItem('ia-pronta') === 'true';

        if (isAiReadyInSession) {
            // Se sim, tenta inicializar diretamente (será rápido)
            console.log("IA já inicializada nesta sessão. Recriando sessão...");
            this.#chatbotView.appendBotMessage(this.firstBotMessage, null, false);
            await this.#initializeAndEnableChat();
        } else {
            // Se não, mostra o botão para o usuário iniciar
            console.log("IA precisa de inicialização do usuário.");
            this.#chatbotView.appendBotMessage(this.firstBotMessage, null, false);
            this.#chatbotView.showDownloadState();
        }
    }


     #setupEvents() {
        this.#chatbotView.setupEventHandlers({
            onOpen: this.#onOpen.bind(this),
            onSend: this.#chatBotReply.bind(this),
            onStop: this.#handleStop.bind(this),
            onInitAI: this.#handleInitAI.bind(this)
        });
    }

    async #handleInitAI() {
        await this.#initializeAndEnableChat();
    }
     async #initializeAndEnableChat() {
        this.#chatbotView.showProgress();

        const success = await this.#promptService.init(this.systemPromptText, (progress) => {
            this.#chatbotView.updateProgress(progress);
        });

        if (success) {
            this.#chatbotView.hideInitialState();
            this.#chatbotView.setInputEnabled(true);
            this.#chatbotView.focusInput();
            this.#chatbotView.appendBotMessage("Assistente pronto! Como posso ajudar?", null, false);
            // SALVA O SUCESSO NA SESSÃO
            sessionStorage.setItem('ia-pronta', 'true');
        } else {
            this.#handleErrorState("Ocorreu um erro ao preparar o assistente. Seu dispositivo pode não ser compatível.");
            // Garante que a flag seja removida em caso de falha
            sessionStorage.removeItem('ia-pronta');
        }
    }

     // Nova função auxiliar para lidar com estados de erro
    #handleErrorState(message) {
        this.#chatbotView.appendBotMessage(message, null, false);
        this.#chatbotView.setInputEnabled(false);
        this.#chatbotView.hideInitialState(); // Garante que o botão de download não fique visível
        this.#chatbotView.hideTypingIndicator();
    }


    #handleStop() {
        if (this.#abortController) {
            this.#abortController.abort();
        }
    }

    async #chatBotReply(userMsg) {
        this.#chatbotView.showTypingIndicator();
        this.#chatbotView.setInputEnabled(false);
        try {
            this.#abortController = new AbortController();
            const contentNode = this.#chatbotView.createStreamingBotMessage();
            const response = this.#promptService.prompt(
                userMsg,
                this.#abortController.signal,
            );
            let fullResponse = '';
            let lastMessage = 'noop';
            const updateText = () => {
                if (!fullResponse) return;
                if (fullResponse === lastMessage) return;
                lastMessage = fullResponse;
                this.#chatbotView.hideTypingIndicator();
                this.#chatbotView.updateStreamingBotMessage(contentNode, fullResponse);
            };

            const intervalId = setInterval(updateText, 200);
            const stoptGenerating = () => {
                clearInterval(intervalId);
                updateText();
                this.#chatbotView.setInputEnabled(true);
            };
            this.#abortController.signal.addEventListener('abort', stoptGenerating);
            for await (const chunk of response) {
                if (!chunk) continue;
                fullResponse += chunk;
            }
            stoptGenerating();

        } catch (error) {
            this.#chatbotView.hideTypingIndicator();
            if (error.name === 'AbortError') return console.log('Geração abortada pelo usuário');

            this.#chatbotView.appendBotMessage('Desculpe, ocorreu um erro. Tente novamente mais tarde.');
            console.log("Ai prompt error", error);
        }
    }

    // Método #onOpen simplificado para não causar problemas.
    async #onOpen() {
        console.log("Janela do chat aberta.");
    }

    #checkRequirements() {
        const errors = [];
        //@ts-ignore
        const iChrome = window.chrome;
        if (!iChrome) {
            errors.push('Este recurso só funciona no Google Chrome ou Chrome Canary.');
        }

        if (!('LanguageModel' in window)) {
            errors.push('As APIs nativas de IA não estão ativas.');
            errors.push('Ative a seguinte flag em chrome://flags/:');
            errors.push('- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)');
            errors.push('Depois reinicie o Chrome e tente novamente.');
        }

        return errors;
    }
}

export class PromptService {
    #messages = [];
    #session = null;

    async init(initialPrompt) {
        if (!window.LanguageModel) return;

        // Sempre reinicia o array, garantindo que o system vem primeiro
        this.#messages = [{
            role: 'system',
            content: initialPrompt
        }];

        return this.#createSession();
    }

    async #createSession() {
        this.#session = await LanguageModel.create({
            initialPrompts: this.#messages,
            expectedInputLanguages: ['pt'],
        });
        return this.#session;
    }

    hasSession() {
        return !!this.#session;
    }

    prompt(text, signal) {
        this.#messages.push({
            role: 'user',
            content: text,
        });
        return this.#session.promptStreaming(this.#messages, {
            signal
        });
    }
}

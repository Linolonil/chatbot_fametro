export class PromptService {
    #messages = [];
    #session = null;


     async init(initialPrompt, onProgress) {
        if (!window.LanguageModel) {
            console.error("LanguageModel API não encontrada.");
            return false;
        }

        this.#messages = [{ role: 'system', content: initialPrompt }];

        try {
            // VOLTANDO AO MÉTODO ORIGINAL E CORRETO: LanguageModel.create()
            this.#session = await window.LanguageModel.create({
                initialPrompts: this.#messages,
                // A opção de progresso pode não existir neste método,
                // mas não causa erro se for ignorada.
                // Vamos mantê-la por segurança.
                progress: (progress) => {
                    if (onProgress) {
                        onProgress(progress);
                    }
                }
            });
            console.log("Sessão de IA criada com sucesso!");
            return true;
        } catch (error) {
            // Este catch agora vai pegar o InvalidStateError se o dispositivo não for compatível
            console.error("Falha ao criar a sessão de IA:", error);
            this.#session = null;
            return false;
        }
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

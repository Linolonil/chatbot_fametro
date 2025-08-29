// @ts-nocheck
import { ChatbotView } from './views/chatBotView.js';
import { PromptService } from './services/promptService.js';
import { ChatbotController } from './controllers/chatBotController.js';

import css from './ew-chatbot.css?raw';
import html from './ew-chatbot.html?raw';

(async () => {
    const [systemPrompt, config, llmsTxt] = await Promise.all([
        fetch('/botData/systemPrompt.txt').then(r => r.text()),
        fetch('/botData/chatbot-config.json').then(r => r.json()),
        fetch('/llms.txt').then(r => r.text()),
    ]);

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const promptService = new PromptService();
    const chatbotView = new ChatbotView(config);
    const controller = new ChatbotController({ chatbotView, promptService });
    
    const text = systemPrompt.concat('\n', llmsTxt);
    controller.init({
        firstBotMessage: config.firstBotMessage,
        text,
    });

})();

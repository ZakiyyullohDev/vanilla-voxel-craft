class HUD {
    constructor(game) {
        this.game = game;
        this.fpsElement = document.getElementById('fps');
        this.coordsElement = document.getElementById('coords');
        this.modeElement = document.getElementById('mode');
        this.hotbarSlots = document.querySelectorAll('.hotbar-slot');
        
        this.messageQueue = [];
        this.currentMessage = null;
        
        this.setupMessageSystem();
    }
    
    setupMessageSystem() {
        this.messageContainer = document.createElement('div');
        this.messageContainer.className = 'message-container';
        this.messageContainer.style.cssText = `
            position: absolute;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 200;
            pointer-events: none;
        `;
        document.getElementById('hud').appendChild(this.messageContainer);
    }
    
    updateFPS(fps) {
        if (this.fpsElement) {
            this.fpsElement.textContent = `FPS: ${fps}`;
        }
    }
    
    updateCoords(position) {
        if (this.coordsElement) {
            this.coordsElement.textContent = 
                `X: ${Math.floor(position.x)}, Y: ${Math.floor(position.y)}, Z: ${Math.floor(position.z)}`;
        }
    }
    
    updateMode() {
        if (this.modeElement) {
            let mode = this.game.survivalMode ? 'Survival' : 'Creative';
            if (this.game.noclip) mode += ' (Noclip)';
            this.modeElement.textContent = mode + ' Mode';
        }
    }
    
    updateHotbar(selectedBlock) {
        this.hotbarSlots.forEach((slot, index) => {
            if (index + 1 === selectedBlock) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }
    
    showMessage(text, duration = 3000, type = 'info') {
        const message = {
            text: text,
            duration: duration,
            type: type,
            id: Date.now() + Math.random()
        };
        
        this.messageQueue.push(message);
        this.processMessageQueue();
    }
    
    processMessageQueue() {
        if (this.currentMessage || this.messageQueue.length === 0) return;
        
        const message = this.messageQueue.shift();
        this.currentMessage = message;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${message.type}`;
        messageElement.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            transform: translateY(-20px);
            opacity: 0;
            transition: all 0.3s ease;
            backdrop-filter: blur(4px);
            border: 2px solid ${this.getMessageColor(message.type)};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        messageElement.textContent = message.text;
        
        this.messageContainer.appendChild(messageElement);
        
        requestAnimationFrame(() => {
            messageElement.style.transform = 'translateY(0)';
            messageElement.style.opacity = '1';
        });
        
        setTimeout(() => {
            messageElement.style.transform = 'translateY(-20px)';
            messageElement.style.opacity = '0';
            
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
                this.currentMessage = null;
                this.processMessageQueue();
            }, 300);
        }, message.duration);
    }
    
    getMessageColor(type) {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'warning': return '#FF9800';
            case 'error': return '#F44336';
            default: return '#2196F3';
        }
    }
    
    showHealth(health, maxHealth) {
        let healthElement = document.getElementById('health-bar');
        
        if (!healthElement) {
            healthElement = document.createElement('div');
            healthElement.id = 'health-bar';
            healthElement.style.cssText = `
                position: absolute;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 4px;
                pointer-events: none;
            `;
            document.getElementById('hud').appendChild(healthElement);
        }
        
        healthElement.innerHTML = '';
        
        for (let i = 0; i < maxHealth; i++) {
            const heart = document.createElement('div');
            heart.style.cssText = `
                width: 20px;
                height: 20px;
                background: ${i < health ? '#E91E63' : 'rgba(255, 255, 255, 0.3)'};
                border: 2px solid #fff;
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                transform: rotate(-45deg);
            `;
            healthElement.appendChild(heart);
        }
    }
    
    showCrosshair(visible = true) {
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            crosshair.style.display = visible ? 'block' : 'none';
        }
    }
    
    showLoadingIndicator(text = 'Loading...') {
        let indicator = document.getElementById('loading-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'loading-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                backdrop-filter: blur(4px);
                z-index: 1500;
            `;
            document.getElementById('hud').appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div style="margin-bottom: 10px;">${text}</div>
            <div style="width: 40px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: #4096ff; animation: loading 1s infinite;"></div>
            </div>
        `;
        
        if (!document.getElementById('loading-animation-style')) {
            const style = document.createElement('style');
            style.id = 'loading-animation-style';
            style.textContent = `
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `;
            document.head.appendChild(style);
        }
        
        indicator.style.display = 'block';
    }
    
    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

window.HUD = HUD;
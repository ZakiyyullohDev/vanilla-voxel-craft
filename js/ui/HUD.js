class HUD {
    constructor(game) {
        this.game = game;
        this.setupElements();
    }
    
    setupElements() {
        this.fpsElement = document.getElementById('fps');
        this.coordsElement = document.getElementById('coords');
        this.modeElement = document.getElementById('mode');
        this.hotbarSlots = document.querySelectorAll('.hotbar-slot');
        this.messageTimeout = null;
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
    
    showMessage(message) {
        let messageElement = document.getElementById('game-message');
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'game-message';
            messageElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                font-size: 18px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(messageElement);
        }
        
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.messageTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
        }, 2000);
    }
}

window.HUD = HUD;
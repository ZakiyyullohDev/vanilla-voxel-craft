class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.isLoading = true;
        this.noclip = false;
        this.survivalMode = false;
        this.selectedBlock = 1;
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastTime = 0;
        this.fps = 60;
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        
        this.initializeGame();
    }
    
    async initializeGame() {
        this.updateLoadingProgress(20, "Initializing renderer...");
        this.renderer = new Renderer();
        await this.renderer.init();
        
        this.updateLoadingProgress(40, "Creating world...");
        this.world = new World();
        await this.world.init();
        
        this.updateLoadingProgress(60, "Loading saved data...");
        this.saveManager = new SaveManager();
        await this.loadWorld();
        
        this.updateLoadingProgress(80, "Setting up UI...");
        this.hud = new HUD(this);
        this.setupEventListeners();
        
        this.updateLoadingProgress(100, "Ready!");
        setTimeout(() => {
            this.hideLoading();
            this.start();
        }, 500);
    }
    
    updateLoadingProgress(percent, message) {
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.querySelector('.loading-content p');
        if (progressBar) progressBar.style.width = percent + '%';
        if (loadingText) loadingText.textContent = message;
    }
    
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        this.isLoading = false;
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('resize', () => this.renderer.handleResize());
        
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('save-btn').addEventListener('click', () => this.saveWorld());
        document.getElementById('load-btn').addEventListener('click', () => this.loadWorld());
        document.getElementById('regenerate-btn').addEventListener('click', () => this.regenerateWorld());
        document.getElementById('toggle-mode-btn').addEventListener('click', () => this.toggleGameMode());
        
        document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
            slot.addEventListener('click', () => this.selectBlock(index + 1));
        });
    }
    
    handleKeyDown(e) {
        if (this.isLoading) return;
        
        this.keys[e.code] = true;
        
        if (e.code === 'Escape') {
            this.togglePause();
        } else if (e.code === 'KeyF') {
            this.toggleNoclip();
        } else if (e.code >= 'Digit1' && e.code <= 'Digit6') {
            const blockNum = parseInt(e.code.replace('Digit', ''));
            this.selectBlock(blockNum);
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.code] = false;
    }
    
    handleMouseMove(e) {
        if (this.isLoading || this.isPaused) return;
        
        this.mouseX = e.movementX || 0;
        this.mouseY = e.movementY || 0;
        this.renderer.updateCamera(this.mouseX, this.mouseY);
    }
    
    handleMouseDown(e) {
        if (this.isLoading || this.isPaused) return;
        
        if (!document.pointerLockElement) {
            this.renderer.canvas.requestPointerLock();
            return;
        }
        
        if (e.button === 0) {
            this.breakBlock();
        } else if (e.button === 2) {
            this.placeBlock();
        }
    }
    
    selectBlock(blockType) {
        this.selectedBlock = blockType;
        this.hud.updateHotbar(blockType);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const menu = document.getElementById('pause-menu');
        
        if (this.isPaused) {
            menu.classList.remove('hidden');
            document.exitPointerLock();
        } else {
            menu.classList.add('hidden');
            this.renderer.canvas.requestPointerLock();
        }
    }
    
    toggleNoclip() {
        this.noclip = !this.noclip;
        this.hud.updateMode();
    }
    
    toggleGameMode() {
        this.survivalMode = !this.survivalMode;
        this.hud.updateMode();
    }
    
    resume() {
        this.togglePause();
    }
    
    breakBlock() {
        const result = this.renderer.raycast();
        if (result && result.block && result.block.type !== 0) {
            this.world.setBlock(result.position.x, result.position.y, result.position.z, 0);
        }
    }
    
    placeBlock() {
        const result = this.renderer.raycast();
        if (result && result.normal) {
            const pos = result.position.clone().add(result.normal);
            if (!this.renderer.isPlayerAtPosition(pos)) {
                this.world.setBlock(pos.x, pos.y, pos.z, this.selectedBlock);
            }
        }
    }
    
    async saveWorld() {
        try {
            await this.saveManager.save(this.world, this.renderer.camera.position);
            this.hud.showMessage("World saved!");
        } catch (error) {
            this.hud.showMessage("Save failed!");
        }
    }
    
    async loadWorld() {
        try {
            const data = await this.saveManager.load();
            if (data) {
                this.world.loadChunks(data.chunks);
                if (data.playerPosition) {
                    this.renderer.camera.position.copy(data.playerPosition);
                }
                this.hud.showMessage("World loaded!");
            }
        } catch (error) {
            console.warn("Load failed, generating new world");
        }
    }
    
    async regenerateWorld() {
        this.world.clear();
        await this.world.generateInitialChunks();
        this.hud.showMessage("New world generated!");
        this.resume();
    }
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.updateFPS();
        
        if (!this.isPaused && !this.isLoading) {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateFPS() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            this.hud.updateFPS(this.fps);
        }
    }
    
    update(deltaTime) {
        this.renderer.update(deltaTime, this.keys, this.noclip);
        this.world.update(this.renderer.camera.position);
        this.hud.updateCoords(this.renderer.camera.position);
    }
    
    render() {
        this.renderer.render(this.world);
    }
}

function initGame() {
    if (typeof THREE !== 'undefined') {
        window.game = new Game();
    } else {
        console.error('THREE.js failed to load');
    }
}

if (typeof THREE !== 'undefined') {
    initGame();
}
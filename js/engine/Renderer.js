class Renderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.velocity = new THREE.Vector3();
        this.canJump = false;
        this.playerHeight = 1.8;
        this.playerRadius = 0.3;
        
        this.pitch = 0;
        this.yaw = 0;
        this.maxPitch = Math.PI / 2 - 0.1;
        
        this.dayTime = 0.5;
        this.dayLength = 120;
    }
    
    async init() {
        this.canvas = document.getElementById('game-canvas');
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 50, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.setupLighting();
        this.setupEventListeners();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(100, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
        
        this.updateDayNightCycle();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateCamera(mouseX, mouseY) {
        this.yaw -= mouseX * 0.002;
        this.pitch -= mouseY * 0.002;
        this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
        
        this.camera.rotation.set(this.pitch, this.yaw, 0);
    }
    
    update(deltaTime, keys, noclip) {
        this.updateDayNightCycle();
        this.updateMovement(deltaTime, keys, noclip);
    }
    
    updateDayNightCycle() {
        this.dayTime += 0.001;
        if (this.dayTime > 1) this.dayTime = 0;
        
        const sunAngle = this.dayTime * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        
        const lightIntensity = Math.max(0.2, sunHeight);
        this.directionalLight.intensity = lightIntensity;
        
        const sunColor = new THREE.Color();
        if (sunHeight > 0) {
            sunColor.setHSL(0.1, 0.5, 0.5 + sunHeight * 0.5);
        } else {
            sunColor.setHSL(0.6, 0.8, 0.1);
        }
        this.directionalLight.color = sunColor;
        
        const skyColor = new THREE.Color();
        if (sunHeight > 0) {
            skyColor.setHSL(0.55, 0.8, 0.4 + sunHeight * 0.4);
        } else {
            skyColor.setHSL(0.6, 0.9, 0.05);
        }
        
        this.scene.background = skyColor;
        this.scene.fog.color = skyColor;
        
        this.directionalLight.position.set(
            Math.cos(sunAngle) * 100,
            Math.sin(sunAngle) * 100,
            50
        );
    }
    
    updateMovement(deltaTime, keys, noclip) {
        const speed = noclip ? 20 : 5;
        const jumpForce = 8;
        const gravity = -25;
        
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyQuaternion(this.camera.quaternion);
        right.applyQuaternion(this.camera.quaternion);
        
        if (noclip) {
            forward.normalize();
            right.normalize();
        } else {
            forward.y = 0;
            forward.normalize();
            right.y = 0;
            right.normalize();
        }
        
        const movement = new THREE.Vector3();
        
        if (keys['KeyW']) movement.add(forward);
        if (keys['KeyS']) movement.sub(forward);
        if (keys['KeyA']) movement.sub(right);
        if (keys['KeyD']) movement.add(right);
        
        if (noclip) {
            if (keys['Space']) movement.y += 1;
            if (keys['ShiftLeft']) movement.y -= 1;
            
            movement.normalize();
            movement.multiplyScalar(speed * deltaTime);
            this.camera.position.add(movement);
        } else {
            movement.normalize();
            movement.multiplyScalar(speed * deltaTime);
            
            this.velocity.x = movement.x * speed;
            this.velocity.z = movement.z * speed;
            
            if (keys['Space'] && this.canJump) {
                this.velocity.y = jumpForce;
                this.canJump = false;
            }
            
            this.velocity.y += gravity * deltaTime;
            
            const newPosition = this.camera.position.clone();
            newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));
            
            if (this.checkCollision(newPosition)) {
                newPosition.copy(this.camera.position);
                this.velocity.set(0, 0, 0);
                this.canJump = true;
            }
            
            this.camera.position.copy(newPosition);
            
            if (this.camera.position.y < -10) {
                this.camera.position.set(0, 50, 0);
                this.velocity.set(0, 0, 0);
            }
        }
    }
    
    checkCollision(position) {
        const playerFeet = position.y - this.playerHeight;
        const blockY = Math.floor(playerFeet);
        
        if (blockY >= 0 && blockY < 16) {
            const blockX = Math.floor(position.x);
            const blockZ = Math.floor(position.z);
            
            if (window.game && window.game.world) {
                const block = window.game.world.getBlock(blockX, blockY, blockZ);
                return block !== 0;
            }
        }
        
        return false;
    }
    
    isPlayerAtPosition(position) {
        const playerPos = this.camera.position;
        const distance = playerPos.distanceTo(position);
        return distance < this.playerRadius * 2;
    }
    
    raycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        if (!window.game || !window.game.world) return null;
        
        const rayOrigin = this.raycaster.ray.origin;
        const rayDirection = this.raycaster.ray.direction;
        const maxDistance = 10;
        const step = 0.1;
        
        for (let distance = 0; distance < maxDistance; distance += step) {
            const point = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(distance));
            const blockX = Math.floor(point.x);
            const blockY = Math.floor(point.y);
            const blockZ = Math.floor(point.z);
            
            const block = window.game.world.getBlock(blockX, blockY, blockZ);
            
            if (block !== 0) {
                const prevPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(distance - step));
                const prevX = Math.floor(prevPoint.x);
                const prevY = Math.floor(prevPoint.y);
                const prevZ = Math.floor(prevPoint.z);
                
                const normal = new THREE.Vector3(
                    prevX - blockX,
                    prevY - blockY,
                    prevZ - blockZ
                );
                
                return {
                    position: new THREE.Vector3(blockX, blockY, blockZ),
                    normal: normal,
                    block: { type: block },
                    distance: distance
                };
            }
        }
        
        return null;
    }
    
    render(world) {
        if (world && world.scene) {
            this.scene.remove(this.scene.getObjectByName('world'));
            world.scene.name = 'world';
            this.scene.add(world.scene);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.Renderer = Renderer;
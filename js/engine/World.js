class World {
    constructor() {
        this.chunks = new Map();
        this.renderDistance = 8;
        this.noise = new SimplexNoise(Math.random() * 1000);
        this.scene = null;
    }
    
    async init() {
        this.scene = new THREE.Group();
        await this.generateInitialChunks();
    }
    
    async generateInitialChunks() {
        const promises = [];
        const center = { x: 0, z: 0 };
        
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                promises.push(this.loadChunk(center.x + x, center.z + z));
            }
        }
        
        await Promise.all(promises);
    }
    
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }
    
    getChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        return this.chunks.get(key);
    }
    
    async loadChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        
        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }
        
        const chunk = new Chunk(chunkX, chunkZ, this);
        this.chunks.set(key, chunk);
        
        chunk.generate();
        
        return chunk;
    }
    
    unloadChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        const chunk = this.chunks.get(key);
        
        if (chunk) {
            if (chunk.mesh && this.scene) {
                this.scene.remove(chunk.mesh);
            }
            chunk.dispose();
            this.chunks.delete(key);
        }
    }
    
    getBlock(x, y, z) {
        if (y < 0 || y >= 16) return 0;
        
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const chunk = this.getChunk(chunkX, chunkZ);
        
        if (!chunk) return 0;
        
        const localX = x - chunkX * 16;
        const localZ = z - chunkZ * 16;
        
        return chunk.getBlock(localX, y, localZ);
    }
    
    setBlock(x, y, z, type) {
        if (y < 0 || y >= 16) return;
        
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const chunk = this.getChunk(chunkX, chunkZ);
        
        if (!chunk) return;
        
        const localX = x - chunkX * 16;
        const localZ = z - chunkZ * 16;
        
        chunk.setBlock(localX, y, localZ, type);
    }
    
    markChunkDirty(chunkX, chunkZ) {
        const chunk = this.getChunk(chunkX, chunkZ);
        if (chunk) {
            chunk.dirty = true;
        }
    }
    
    update(playerPosition) {
        const playerChunkX = Math.floor(playerPosition.x / 16);
        const playerChunkZ = Math.floor(playerPosition.z / 16);
        
        const chunksToLoad = new Set();
        const chunksToKeep = new Set();
        
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                chunksToKeep.add(key);
                
                if (!this.chunks.has(key)) {
                    chunksToLoad.add({ x, z });
                }
            }
        }
        
        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToKeep.has(key)) {
                this.unloadChunk(chunk.x, chunk.z);
            }
        }
        
        chunksToLoad.forEach(({ x, z }) => {
            this.loadChunk(x, z);
        });
        
        this.updateChunkMeshes();
    }
    
    updateChunkMeshes() {
        for (const chunk of this.chunks.values()) {
            if (chunk.dirty) {
                const oldMesh = chunk.mesh;
                if (oldMesh && this.scene) {
                    this.scene.remove(oldMesh);
                }
                
                const newMesh = chunk.createMesh();
                if (newMesh && this.scene) {
                    this.scene.add(newMesh);
                }
            }
        }
    }
    
    clear() {
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh && this.scene) {
                this.scene.remove(chunk.mesh);
            }
            chunk.dispose();
        }
        this.chunks.clear();
    }
    
    loadChunks(savedChunks) {
        this.clear();
        
        for (const [key, chunkData] of savedChunks.entries()) {
            const [x, z] = key.split(',').map(Number);
            const chunk = new Chunk(x, z, this);
            chunk.blocks = chunkData.blocks;
            chunk.modified = chunkData.modified;
            chunk.generated = true;
            chunk.dirty = true;
            
            this.chunks.set(key, chunk);
        }
        
        this.updateChunkMeshes();
    }
    
    getRenderableChunks() {
        return Array.from(this.chunks.values()).filter(chunk => chunk.mesh);
    }
}

window.World = World;
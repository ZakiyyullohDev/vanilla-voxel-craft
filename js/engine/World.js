class World {
    constructor() {
        this.chunks = {};
        this.scene = new THREE.Scene();
        this.noise = new Noise(Math.random() * 10000);
        this.chunkSize = 16;
        this.renderDistance = 4;
    }
    
    async init() {
        await this.generateInitialChunks();
    }
    
    async generateInitialChunks() {
        const promises = [];
        for (let x = -2; x <= 2; x++) {
            for (let y = 0; y <= 3; y++) {
                for (let z = -2; z <= 2; z++) {
                    promises.push(this.loadChunk(x, y, z));
                }
            }
        }
        await Promise.all(promises);
    }
    
    getChunkKey(x, y, z) {
        return `${x},${y},${z}`;
    }
    
    worldToChunkCoords(x, y, z) {
        return {
            chunkX: Math.floor(x / this.chunkSize),
            chunkY: Math.floor(y / this.chunkSize),
            chunkZ: Math.floor(z / this.chunkSize),
            localX: ((x % this.chunkSize) + this.chunkSize) % this.chunkSize,
            localY: ((y % this.chunkSize) + this.chunkSize) % this.chunkSize,
            localZ: ((z % this.chunkSize) + this.chunkSize) % this.chunkSize
        };
    }
    
    async loadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        if (this.chunks[key]) return this.chunks[key];
        
        const chunk = new Chunk(x, y, z, this);
        this.chunks[key] = chunk;
        
        await new Promise(resolve => {
            setTimeout(() => {
                chunk.generateTerrain();
                chunk.buildMesh();
                resolve();
            }, 0);
        });
        
        return chunk;
    }
    
    unloadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        const chunk = this.chunks[key];
        if (chunk) {
            chunk.dispose();
            delete this.chunks[key];
        }
    }
    
    getBlock(x, y, z) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.chunks[this.getChunkKey(coords.chunkX, coords.chunkY, coords.chunkZ)];
        
        if (!chunk) return 0;
        return chunk.getBlock(coords.localX, coords.localY, coords.localZ);
    }
    
    setBlock(x, y, z, type) {
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.chunks[this.getChunkKey(coords.chunkX, coords.chunkY, coords.chunkZ)];
        
        if (chunk) {
            chunk.setBlock(coords.localX, coords.localY, coords.localZ, type);
            chunk.buildMesh();
            
            this.updateNeighborChunks(coords.chunkX, coords.chunkY, coords.chunkZ, coords.localX, coords.localY, coords.localZ);
        }
    }
    
    updateNeighborChunks(chunkX, chunkY, chunkZ, localX, localY, localZ) {
        const neighbors = [];
        
        if (localX === 0) neighbors.push([chunkX - 1, chunkY, chunkZ]);
        if (localX === this.chunkSize - 1) neighbors.push([chunkX + 1, chunkY, chunkZ]);
        if (localY === 0) neighbors.push([chunkX, chunkY - 1, chunkZ]);
        if (localY === this.chunkSize - 1) neighbors.push([chunkX, chunkY + 1, chunkZ]);
        if (localZ === 0) neighbors.push([chunkX, chunkY, chunkZ - 1]);
        if (localZ === this.chunkSize - 1) neighbors.push([chunkX, chunkY, chunkZ + 1]);
        
        for (const [nx, ny, nz] of neighbors) {
            const neighborChunk = this.chunks[this.getChunkKey(nx, ny, nz)];
            if (neighborChunk) {
                neighborChunk.needsUpdate = true;
                neighborChunk.buildMesh();
            }
        }
    }
    
    update(playerPosition) {
        const playerChunkX = Math.floor(playerPosition.x / this.chunkSize);
        const playerChunkY = Math.floor(playerPosition.y / this.chunkSize);
        const playerChunkZ = Math.floor(playerPosition.z / this.chunkSize);
        
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let y = Math.max(0, playerChunkY - 2); y <= Math.min(3, playerChunkY + 2); y++) {
                for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
                    const key = this.getChunkKey(x, y, z);
                    if (!this.chunks[key]) {
                        this.loadChunk(x, y, z);
                    }
                }
            }
        }
        
        for (const key in this.chunks) {
            const [x, y, z] = key.split(',').map(Number);
            const distance = Math.max(
                Math.abs(x - playerChunkX),
                Math.abs(y - playerChunkY),
                Math.abs(z - playerChunkZ)
            );
            
            if (distance > this.renderDistance + 1) {
                this.unloadChunk(x, y, z);
            }
        }
    }
    
    loadChunks(savedChunks) {
        this.clear();
        for (const key in savedChunks) {
            const [x, y, z] = key.split(',').map(Number);
            const chunk = new Chunk(x, y, z, this);
            chunk.blocks = new Uint8Array(savedChunks[key].blocks);
            chunk.buildMesh();
            this.chunks[key] = chunk;
        }
    }
    
    clear() {
        for (const key in this.chunks) {
            this.chunks[key].dispose();
        }
        this.chunks = {};
    }
}

window.World = World;
class SaveManager {
    constructor() {
        this.worldKey = 'voxelcraft_world';
        this.settingsKey = 'voxelcraft_settings';
    }
    
    async save(world, playerPosition) {
        try {
            const data = {
                chunks: this.compressChunks(world.chunks),
                playerPosition: {
                    x: playerPosition.x,
                    y: playerPosition.y,
                    z: playerPosition.z
                },
                timestamp: Date.now(),
                version: '1.0'
            };
            
            const compressed = this.compress(JSON.stringify(data));
            localStorage.setItem(this.worldKey, compressed);
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }
    
    async load() {
        try {
            const compressed = localStorage.getItem(this.worldKey);
            if (!compressed) return null;
            
            const data = JSON.parse(this.decompress(compressed));
            
            return {
                chunks: this.decompressChunks(data.chunks),
                playerPosition: data.playerPosition,
                timestamp: data.timestamp,
                version: data.version
            };
        } catch (error) {
            console.error('Load failed:', error);
            return null;
        }
    }
    
    compressChunks(chunks) {
        const compressed = {};
        
        for (const [key, chunk] of chunks.entries()) {
            if (chunk.modified) {
                compressed[key] = this.compressChunkData(chunk.blocks);
            }
        }
        
        return compressed;
    }
    
    decompressChunks(compressedChunks) {
        const chunks = new Map();
        
        for (const [key, compressedData] of Object.entries(compressedChunks)) {
            const blocks = this.decompressChunkData(compressedData);
            chunks.set(key, { blocks, modified: true });
        }
        
        return chunks;
    }
    
    compressChunkData(blocks) {
        const runs = [];
        let currentBlock = blocks[0];
        let count = 1;
        
        for (let i = 1; i < blocks.length; i++) {
            if (blocks[i] === currentBlock && count < 255) {
                count++;
            } else {
                runs.push([currentBlock, count]);
                currentBlock = blocks[i];
                count = 1;
            }
        }
        runs.push([currentBlock, count]);
        
        return runs;
    }
    
    decompressChunkData(runs) {
        const blocks = new Uint8Array(16 * 16 * 16);
        let index = 0;
        
        for (const [blockType, count] of runs) {
            for (let i = 0; i < count; i++) {
                blocks[index++] = blockType;
            }
        }
        
        return blocks;
    }
    
    compress(str) {
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            return str;
        }
    }
    
    decompress(str) {
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (e) {
            return str;
        }
    }
    
    clear() {
        localStorage.removeItem(this.worldKey);
        localStorage.removeItem(this.settingsKey);
    }
    
    getSize() {
        const world = localStorage.getItem(this.worldKey);
        const settings = localStorage.getItem(this.settingsKey);
        return (world ? world.length : 0) + (settings ? settings.length : 0);
    }
}

window.SaveManager = SaveManager;
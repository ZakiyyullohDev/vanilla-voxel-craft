class SaveManager {
    constructor() {
        this.storageKey = 'voxelcraft_save';
    }
    
    async save(world, playerPosition) {
        const saveData = {
            chunks: this.compressChunks(world.chunks),
            playerPosition: {
                x: playerPosition.x,
                y: playerPosition.y,
                z: playerPosition.z
            },
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(saveData));
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }
    
    async load() {
        try {
            const saveData = localStorage.getItem(this.storageKey);
            if (!saveData) return null;
            
            const parsed = JSON.parse(saveData);
            if (parsed.chunks) {
                parsed.chunks = this.decompressChunks(parsed.chunks);
            }
            return parsed;
        } catch (error) {
            console.error('Load failed:', error);
            return null;
        }
    }
    
    compressChunks(chunks) {
        const compressed = {};
        for (const key in chunks) {
            const chunk = chunks[key];
            if (chunk.blocks) {
                compressed[key] = this.runLengthEncode(chunk.blocks);
            }
        }
        return compressed;
    }
    
    decompressChunks(compressed) {
        const chunks = {};
        for (const key in compressed) {
            chunks[key] = {
                blocks: this.runLengthDecode(compressed[key])
            };
        }
        return chunks;
    }
    
    runLengthEncode(blocks) {
        const encoded = [];
        let currentValue = blocks[0];
        let count = 1;
        
        for (let i = 1; i < blocks.length; i++) {
            if (blocks[i] === currentValue) {
                count++;
            } else {
                encoded.push([currentValue, count]);
                currentValue = blocks[i];
                count = 1;
            }
        }
        encoded.push([currentValue, count]);
        return encoded;
    }
    
    runLengthDecode(encoded) {
        const blocks = [];
        for (const [value, count] of encoded) {
            for (let i = 0; i < count; i++) {
                blocks.push(value);
            }
        }
        return blocks;
    }
    
    clear() {
        localStorage.removeItem(this.storageKey);
    }
}

window.SaveManager = SaveManager;
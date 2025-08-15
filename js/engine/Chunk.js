class Chunk {
    constructor(x, z, world) {
        this.x = x;
        this.z = z;
        this.world = world;
        this.blocks = new Uint8Array(16 * 16 * 16);
        this.mesh = null;
        this.dirty = false;
        this.modified = false;
        this.generated = false;
        
        this.blockTypes = {
            0: { name: 'air', transparent: true, color: 0x000000 },
            1: { name: 'grass', transparent: false, color: 0x7CB342 },
            2: { name: 'dirt', transparent: false, color: 0x8D6E63 },
            3: { name: 'stone', transparent: false, color: 0x616161 },
            4: { name: 'sand', transparent: false, color: 0xFDD835 },
            5: { name: 'water', transparent: true, color: 0x2196F3 },
            6: { name: 'wood', transparent: false, color: 0x8D6E63 }
        };
    }
    
    generate() {
        if (this.generated) return;
        
        const noise = this.world.noise;
        const worldX = this.x * 16;
        const worldZ = this.z * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const wx = worldX + x;
                const wz = worldZ + z;
                
                const heightNoise = noise.octave2D(wx * 0.01, wz * 0.01, 4, 0.5, 1);
                const height = Math.floor(32 + heightNoise * 16);
                
                const caveNoise = noise.octave2D(wx * 0.05, wz * 0.05, 3, 0.6, 1);
                
                for (let y = 0; y < 16; y++) {
                    const worldY = y;
                    const index = this.getIndex(x, y, z);
                    
                    if (worldY > height) {
                        if (worldY <= 30) {
                            this.blocks[index] = 5;
                        } else {
                            this.blocks[index] = 0;
                        }
                    } else if (worldY === height && height > 30) {
                        this.blocks[index] = 1;
                    } else if (worldY > height - 4 && height > 30) {
                        this.blocks[index] = 2;
                    } else if (height <= 30) {
                        this.blocks[index] = 4;
                    } else {
                        if (caveNoise > 0.6 && worldY > 5) {
                            this.blocks[index] = 0;
                        } else {
                            this.blocks[index] = 3;
                        }
                    }
                }
            }
        }
        
        this.generated = true;
        this.dirty = true;
    }
    
    getIndex(x, y, z) {
        return y * 256 + z * 16 + x;
    }
    
    getBlock(x, y, z) {
        if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) {
            return this.world.getBlock(this.x * 16 + x, y, this.z * 16 + z);
        }
        return this.blocks[this.getIndex(x, y, z)];
    }
    
    setBlock(x, y, z, type) {
        if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) return;
        
        const index = this.getIndex(x, y, z);
        if (this.blocks[index] !== type) {
            this.blocks[index] = type;
            this.dirty = true;
            this.modified = true;
            
            if (x === 0) this.world.markChunkDirty(this.x - 1, this.z);
            if (x === 15) this.world.markChunkDirty(this.x + 1, this.z);
            if (z === 0) this.world.markChunkDirty(this.x, this.z - 1);
            if (z === 15) this.world.markChunkDirty(this.x, this.z + 1);
        }
    }
    
    createMesh() {
        if (!this.dirty) return this.mesh;
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const indices = [];
        let vertexIndex = 0;
        
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                for (let z = 0; z < 16; z++) {
                    const blockType = this.getBlock(x, y, z);
                    if (blockType === 0) continue;
                    
                    const blockInfo = this.blockTypes[blockType];
                    if (!blockInfo) continue;
                    
                    const worldX = this.x * 16 + x;
                    const worldZ = this.z * 16 + z;
                    
                    const faces = [
                        { dir: [0, 1, 0], corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]] },
                        { dir: [0, -1, 0], corners: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]] },
                        { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
                        { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
                        { dir: [0, 0, 1], corners: [[0,0,1],[0,1,1],[1,1,1],[1,0,1]] },
                        { dir: [0, 0, -1], corners: [[1,0,0],[1,1,0],[0,1,0],[0,0,0]] }
                    ];
                    
                    for (const face of faces) {
                        const neighborX = x + face.dir[0];
                        const neighborY = y + face.dir[1];
                        const neighborZ = z + face.dir[2];
                        const neighbor = this.getBlock(neighborX, neighborY, neighborZ);
                        
                        if (neighbor === 0 || (this.blockTypes[neighbor] && this.blockTypes[neighbor].transparent && neighbor !== blockType)) {
                            const color = new THREE.Color(blockInfo.color);
                            
                            const baseIndex = vertexIndex;
                            for (const corner of face.corners) {
                                vertices.push(
                                    worldX + corner[0],
                                    y + corner[1],
                                    worldZ + corner[2]
                                );
                                colors.push(color.r, color.g, color.b);
                            }
                            
                            indices.push(
                                baseIndex, baseIndex + 1, baseIndex + 2,
                                baseIndex, baseIndex + 2, baseIndex + 3
                            );
                            
                            vertexIndex += 4;
                        }
                    }
                }
            }
        }
        
        if (vertices.length === 0) {
            this.mesh = null;
            this.dirty = false;
            return null;
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            transparent: false
        });
        
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.geometry = geometry;
        } else {
            this.mesh = new THREE.Mesh(geometry, material);
        }
        
        this.dirty = false;
        return this.mesh;
    }
    
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

window.Chunk = Chunk;
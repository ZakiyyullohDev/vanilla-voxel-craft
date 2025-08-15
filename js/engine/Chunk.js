class Chunk {
    constructor(x, y, z, world) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.world = world;
        this.size = 16;
        this.blocks = new Uint8Array(this.size * this.size * this.size);
        this.mesh = null;
        this.needsUpdate = true;
    }
    
    getBlockIndex(x, y, z) {
        return x + y * this.size + z * this.size * this.size;
    }
    
    getBlock(x, y, z) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
            return 0;
        }
        return this.blocks[this.getBlockIndex(x, y, z)];
    }
    
    setBlock(x, y, z, type) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
            return;
        }
        this.blocks[this.getBlockIndex(x, y, z)] = type;
        this.needsUpdate = true;
    }
    
    generateTerrain() {
        const noise = this.world.noise;
        const worldX = this.x * this.size;
        const worldY = this.y * this.size;
        const worldZ = this.z * this.size;
        
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                const height = Math.floor(
                    noise.octaveNoise((worldX + x) * 0.01, 0, (worldZ + z) * 0.01) * 10 + 30
                );
                
                for (let y = 0; y < this.size; y++) {
                    const worldYPos = worldY + y;
                    
                    if (worldYPos < height - 5) {
                        this.setBlock(x, y, z, 3);
                    } else if (worldYPos < height - 1) {
                        this.setBlock(x, y, z, 2);
                    } else if (worldYPos < height) {
                        this.setBlock(x, y, z, 1);
                    } else if (worldYPos < 25) {
                        this.setBlock(x, y, z, 5);
                    } else {
                        this.setBlock(x, y, z, 0);
                    }
                }
            }
        }
    }
    
    buildMesh() {
        if (!this.needsUpdate || !this.world.scene) return;
        
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const indices = [];
        let indexOffset = 0;
        
        const blockColors = {
            1: [0.2, 0.8, 0.2],
            2: [0.6, 0.4, 0.2],
            3: [0.5, 0.5, 0.5],
            4: [0.9, 0.8, 0.3],
            5: [0.2, 0.4, 0.8],
            6: [0.4, 0.2, 0.1]
        };
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockType = this.getBlock(x, y, z);
                    if (blockType === 0) continue;
                    
                    const worldX = this.x * this.size + x;
                    const worldY = this.y * this.size + y;
                    const worldZ = this.z * this.size + z;
                    
                    const color = blockColors[blockType] || [1, 1, 1];
                    
                    const faces = [
                        { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
                        { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
                        { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
                        { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
                        { dir: [0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
                        { dir: [0, 0, -1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] }
                    ];
                    
                    for (const face of faces) {
                        const [dx, dy, dz] = face.dir;
                        const neighborType = this.getNeighborBlock(x + dx, y + dy, z + dz);
                        
                        if (neighborType === 0 || (neighborType === 5 && blockType !== 5)) {
                            const baseIndex = vertices.length / 3;
                            
                            for (const corner of face.corners) {
                                vertices.push(
                                    worldX + corner[0],
                                    worldY + corner[1],
                                    worldZ + corner[2]
                                );
                                colors.push(...color);
                            }
                            
                            indices.push(
                                baseIndex, baseIndex + 1, baseIndex + 2,
                                baseIndex, baseIndex + 2, baseIndex + 3
                            );
                        }
                    }
                }
            }
        }
        
        if (vertices.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshLambertMaterial({ 
                vertexColors: true,
                transparent: true,
                opacity: 0.9
            });
            
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.world.scene.add(this.mesh);
        }
        
        this.needsUpdate = false;
    }
    
    getNeighborBlock(x, y, z) {
        if (x >= 0 && x < this.size && y >= 0 && y < this.size && z >= 0 && z < this.size) {
            return this.getBlock(x, y, z);
        }
        
        const worldX = this.x * this.size + x;
        const worldY = this.y * this.size + y;
        const worldZ = this.z * this.size + z;
        
        return this.world.getBlock(worldX, worldY, worldZ);
    }
    
    dispose() {
        if (this.mesh) {
            this.world.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

window.Chunk = Chunk;
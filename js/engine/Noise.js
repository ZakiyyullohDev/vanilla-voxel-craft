class Noise {
    constructor(seed = 12345) {
        this.seed = seed;
        this.perm = [];
        this.gradP = [];
        this.grad3 = [
            [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
            [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(this.seededRandom() * 256);
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.gradP[i] = this.grad3[this.perm[i] % 12];
        }
    }
    
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }
    
    mix(a, b, t) {
        return (1 - t) * a + t * b;
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    noise(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;
        
        return this.mix(
            this.mix(
                this.mix(
                    this.dot(this.gradP[AA], x, y, z),
                    this.dot(this.gradP[BA], x - 1, y, z),
                    u
                ),
                this.mix(
                    this.dot(this.gradP[AB], x, y - 1, z),
                    this.dot(this.gradP[BB], x - 1, y - 1, z),
                    u
                ),
                v
            ),
            this.mix(
                this.mix(
                    this.dot(this.gradP[AA + 1], x, y, z - 1),
                    this.dot(this.gradP[BA + 1], x - 1, y, z - 1),
                    u
                ),
                this.mix(
                    this.dot(this.gradP[AB + 1], x, y - 1, z - 1),
                    this.dot(this.gradP[BB + 1], x - 1, y - 1, z - 1),
                    u
                ),
                v
            ),
            w
        );
    }
    
    octaveNoise(x, y, z, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return total / maxValue;
    }
}

window.Noise = Noise;
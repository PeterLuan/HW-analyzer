// Memory Hierarchy Sizes (example - adjust based on RDNA3.5 specs)
const L1_SIZE = 32 * 1024; // 32KB
const L2_SIZE = 2 * 1024 * 1024; // 2MB
const LDS_SIZE = 128 * 1024; // 128KB
const GLOBAL_MEMORY_SIZE = 8 * 1024 * 1024 * 1024; //8GB example

// Simplified Instruction Set (example - extend as needed)
enum InstructionType {
    LOAD,
    STORE,
    LDS_LOAD,
    LDS_STORE,
}

type Instruction = {
    type: InstructionType;
    address: number;
    size?: number; // Optional size for larger accesses
};

// Memory Block Representation
type MemoryBlock = {
    address: number;
    size: number;
    lastUsed: number; // For LRU eviction
};

// Cache Class
class Cache {
    size: number;
    blocks: Map<number, MemoryBlock>;
    hitCount: number;
    missCount: number;
    nextTimeStamp: number;
    lineSize: number; // Cache line size in bytes, e.g., 64 bytes

    constructor(size: number, lineSize: number) {
        this.size = size;
        this.blocks = new Map();
        this.hitCount = 0;
        this.missCount = 0;
        this.nextTimeStamp = 0;
        this.lineSize = lineSize;
    }

    access(address: number): boolean {
        this.nextTimeStamp++;
        const blockAddress = Math.floor(address / this.lineSize) * this.lineSize; // Align to cache line

        if (this.blocks.has(blockAddress)) {
            this.hitCount++;
            // Update LRU timestamp
            this.blocks.get(blockAddress)!.lastUsed = this.nextTimeStamp;
            return true; // Hit
        } else {
            this.missCount++;
            this.allocate(blockAddress, this.lineSize); // Allocate a full cache line
            return false; // Miss
        }
    }

    allocate(address: number, size: number) {
        // Evict LRU block if necessary
        if (this.blocks.size * this.lineSize >= this.size) {
            this.evict();
        }

        this.blocks.set(address, { address, size, lastUsed: this.nextTimeStamp });
    }

    evict() {
        // Find the least recently used block
        let lruBlock: MemoryBlock | null = null;
        let lruTimestamp = this.nextTimeStamp;

        for (const block of this.blocks.values()) {
            if (block.lastUsed < lruTimestamp) {
                lruTimestamp = block.lastUsed;
                lruBlock = block;
            }
        }

        if (lruBlock) {
            this.blocks.delete(lruBlock.address);
        }
    }

    getHitRate(): number {
        const totalAccesses = this.hitCount + this.missCount;
        return totalAccesses > 0 ? (this.hitCount / totalAccesses) * 100 : 0;
    }
}

// LDS Class (simplified for now)
class LDS {
    size: number;
    used: number;

    constructor(size: number) {
        this.size = size;
        this.used = 0;
    }

    allocate(size: number) {
        if (this.used + size <= this.size) {
            this.used += size;
        } else {
            // Handle LDS overflow (e.g., spill to global memory)
            console.warn("LDS overflow!");
        }
    }

    getUtilization(): number {
        return (this.used / this.size) * 100;
    }
}

// Memory Hierarchy
const l1Cache = new Cache(L1_SIZE, 64); // Assume 64-byte cache lines for L1
const l2Cache = new Cache(L2_SIZE, 64); // Assume 64-byte cache lines for L2
const lds = new LDS(LDS_SIZE);
const globalMemory = { size: GLOBAL_MEMORY_SIZE }; // Not tracking individual blocks for simplicity

// Function to parse kernel code into instructions
function parseKernel(kernelCode: string): Instruction[] {
    const instructions: Instruction[] = [];
    const lines = kernelCode.split('\n');

    for (const line of lines) {
        const parts = line.trim().split(/\s+/); // Split by whitespace
        if (parts.length >= 2) {
            const typeStr = parts[0].toUpperCase();
            const address = parseInt(parts[1]);

            let type: InstructionType;
            switch (typeStr) {
                case 'LOAD':
                    type = InstructionType.LOAD;
                    break;
                case 'STORE':
                    type = InstructionType.STORE;
                    break;
                case 'LDS_LOAD':
                    type = InstructionType.LDS_LOAD;
                    break;
                case 'LDS_STORE':
                    type = InstructionType.LDS_STORE;
                    break;
                default:
                    console.warn(`Unknown instruction type: ${typeStr}`);
                    continue; // Skip unknown instructions
            }

            instructions.push({ type, address });
        }
    }

    return instructions;
}

// Function to simulate memory accesses
function simulateMemoryAccess(instruction: Instruction) {
    switch (instruction.type) {
        case InstructionType.LOAD:
            if (!l1Cache.access(instruction.address)) {
                if (!l2Cache.access(instruction.address)) {
                    // Access global memory (simplified)
                }
            }
            break;
        case InstructionType.STORE:
            // Store operations usually write-through or write-back to L1
            l1Cache.access(instruction.address); // Simplified
            break;
        case InstructionType.LDS_LOAD:
        case InstructionType.LDS_STORE:
            lds.allocate(instruction.size || 4); // Assuming 4 bytes if size not specified
            break;
    }
}

// Function to update the UI
function updateUI() {
    document.getElementById('l1-hit-rate')!.textContent = l1Cache.getHitRate().toFixed(2) + '%';
    document.getElementById('l2-hit-rate')!.textContent = l2Cache.getHitRate().toFixed(2) + '%';
    document.getElementById('lds-utilization')!.textContent = lds.getUtilization().toFixed(2) + '%';

    // Update memory visualization (basic example)
    // In a real application, you'd use a more sophisticated visualization
    document.getElementById('l1-cache')!.style.backgroundColor = l1Cache.getHitRate() > 50 ? 'lightgreen' : 'lightcoral';
    document.getElementById('l2-cache')!.style.backgroundColor = l2Cache.getHitRate() > 50 ? 'lightgreen' : 'lightcoral';
    document.getElementById('lds')!.style.backgroundColor = lds.getUtilization() > 80 ? 'orange' : 'lightblue';
}

// Main function
function main() {
    const analyzeButton = document.getElementById('analyze-button');
    analyzeButton?.addEventListener('click', () => {
        const kernelCode = (document.getElementById('kernel-code') as HTMLTextAreaElement).value;
        const instructions = parseKernel(kernelCode);

        for (const instruction of instructions) {
            simulateMemoryAccess(instruction);
        }

        updateUI();
    });
}

// Run the main function when the page loads
window.addEventListener('DOMContentLoaded', main);
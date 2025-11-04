export class Rom {
    static builder(): RomBuilder;
    hash(salt: Uint8Array, nb_loops: number, nb_instrs: number): Uint8Array;
}

export class RomBuilder {
    constructor();
    key(key: Uint8Array): void;
    size(size: number): void;
    gen_full_random(): void;
    gen_two_steps(pre_size: number, mixing_numbers: number): void;
    build(): Rom;
}

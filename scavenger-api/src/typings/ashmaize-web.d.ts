declare module 'ashmaize-web' {
  export class Rom {
    static builder(): RomBuilder;
    hash(input: Uint8Array, nbLoops: number, nbInstrs: number): Uint8Array;
  }

  export class RomBuilder {
    key(key: Uint8Array): void;
    size(size: number): void;
    gen_full_random(): void;
    gen_two_steps(preSize: number, mixingNumbers: number): void;
    build(): Rom;
  }
}


import { Module } from '@nestjs/common';
import { AshmaizeWasmService } from './src/ashmaize/ashmaize-wasm.service';

@Module({
  providers: [AshmaizeWasmService],
  exports: [AshmaizeWasmService],
})
export class TestModule {}
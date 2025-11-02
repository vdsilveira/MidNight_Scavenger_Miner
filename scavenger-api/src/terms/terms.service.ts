import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TermsService {
  private readonly defaultVersion = '1-0';
  private readonly termsContent = `**TOKEN END-USER TERMS**

Last updated: 15 Aug 2025.

These Token End-User Terms (the "**Token End-User Terms**") ...`;

  getTermsAndConditions() {
    return this.getTermsAndConditionsByVersion(this.defaultVersion);
  }

  getTermsAndConditionsByVersion(version: string) {
    // Por enquanto, só suportamos versão 1-0
    if (version !== this.defaultVersion) {
      throw new NotFoundException(`Terms and Conditions version ${version} not found`);
    }

    const message = `I agree to abide by the terms and conditions as described in version ${version} of the Midnight scavenger mining process: 281ba5f69f4b943e3fb8a20390878a232787a04e4be22177f2472b63df01c200`;

    return {
      version: this.defaultVersion,
      content: this.termsContent,
      message,
    };
  }
}


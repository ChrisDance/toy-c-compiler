export class ARM64Interpreter {
  private registers: Map<string, bigint> = new Map();
  private stack: Map<bigint, bigint> = new Map();

  private stackPointer: bigint = 0x7fff_0000n;
  private framePointer: bigint = 0x7fff_0000n;
  private linkRegister: bigint = 0n;

  private instructions: Instruction[] = [];
  private pc: number = 0;
  private labels: Map<string, number> = new Map();
  private running: boolean = false;

  private stringLiterals: Map<string, string> = new Map();

  private output: string[] = [];

  private callStack: number[] = [];

  private initializeRegisters(): void {
    for (let i = 0; i <= 30; i++) {
      this.registers.set(`x${i}`, 0n);
    }

    this.registers.set("sp", this.stackPointer);
    this.registers.set("x29", this.framePointer);
    this.registers.set("x30", this.linkRegister);
  }

  public load(assembly: string): ARM64Interpreter {
    this.initializeRegisters();
    this.instructions = [];
    this.labels.clear();
    this.stringLiterals.clear();
    this.pc = 0;

    const lines = assembly.split("\n").map((line) => line.trim());
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === "" || line.startsWith(";") || line.startsWith("//")) {
        continue;
      }

      if (line.startsWith(".section")) {
        currentSection = line;
        continue;
      }

      if (line.startsWith(".") && !line.includes(":")) {
        continue;
      }

      if (line.includes(":")) {
        const labelName = line.substring(0, line.indexOf(":")).trim();
        this.labels.set(labelName, this.instructions.length);

        if (currentSection.includes("cstring")) {
          const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
          if (nextLine.startsWith(".asciz")) {
            const stringValue = this.parseStringLiteral(nextLine);
            this.stringLiterals.set(labelName, stringValue);
            i++;
          }
        }
        continue;
      }

      const instruction = this.parseInstruction(line);
      if (instruction) {
        this.instructions.push(instruction);
      }
    }

    return this;
  }

  private parseStringLiteral(line: string): string {
    const match = line.match(/\.asciz\s+"([^"]*)"/);
    return match ? match[1] : "";
  }

  private parseInstruction(line: string): Instruction | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(".") || trimmed.startsWith(";")) {
      return null;
    }

    const commentIndex = trimmed.indexOf(";");
    const instruction =
      commentIndex >= 0 ? trimmed.substring(0, commentIndex).trim() : trimmed;

    const parts = instruction.split(/\s+/);
    const opcode = parts[0];

    const operandString = parts.slice(1).join(" ");
    const operands: string[] = [];

    let current = "";
    let inBrackets = false;
    let i = 0;

    while (i < operandString.length) {
      const char = operandString[i];

      if (char === "[") {
        inBrackets = true;
        current += char;
      } else if (char === "]") {
        inBrackets = false;
        current += char;
      } else if (char === "," && !inBrackets) {
        if (current.trim()) {
          operands.push(current.trim());
        }
        current = "";
      } else {
        current += char;
      }

      i++;
    }

    if (current.trim()) {
      operands.push(current.trim());
    }

    return {
      opcode: opcode.toLowerCase(),
      operands: operands,
      original: line,
    };
  }

  public run(): ExecutionResult {
    this.running = true;
    this.output = [];
    this.pc = 0;
    this.callStack = [];

    const mainLabel = this.labels.get("_main");
    if (mainLabel !== undefined) {
      this.pc = mainLabel;
    }

    let stepCount = 0;
    const maxSteps = 10000; /*  prevent infinite loops*/

    try {
      while (
        this.running &&
        this.pc < this.instructions.length &&
        stepCount < maxSteps
      ) {
        this.executeInstruction(this.instructions[this.pc]);
        stepCount++;
      }

      if (stepCount >= maxSteps) {
        throw new Error("Execution timeout - possible infinite loop");
      }

      return {
        success: true,
        output: this.output.join("\n"),
        returnValue: Number(this.registers.get("x0") || 0n),
        steps: stepCount,
      };
    } catch (error) {
      return {
        success: false,
        output: this.output.join("\n"),
        error: error instanceof Error ? error.message : String(error),
        returnValue: -1,
        steps: stepCount,
      };
    }
  }

  private executeInstruction(instruction: Instruction): void {
    const { opcode, operands } = instruction;

    switch (opcode) {
      case "mov":
        this.executeMov(operands);
        break;
      case "add":
        this.executeAdd(operands);
        break;
      case "sub":
        this.executeSub(operands);
        break;
      case "mul":
        this.executeMul(operands);
        break;
      case "ldr":
        this.executeLdr(operands);
        break;
      case "str":
        this.executeStr(operands);
        break;
      case "stp":
        this.executeStp(operands);
        break;
      case "ldp":
        this.executeLdp(operands);
        break;
      case "bl":
        this.executeBl(operands);
        break;
      case "ret":
        this.executeRet();
        break;
      case "cmp":
        this.executeCmp(operands);
        break;
      case "beq":
      case "bne":
      case "blt":
      case "ble":
      case "bgt":
      case "bge":
        this.executeBranch(opcode, operands);
        break;
      case "b":
        this.executeB(operands);
        break;
      case "cset":
        this.executeCset(operands);
        break;
      case "svc":
        this.handleSysCall(operands);
        break;
      default:
        /*functions like adrp we are handing specially */
        this.pc++;
        break;
    }
  }

  private handleSysCall(operands: string[]) {
    if (operands[0] == "#0x80") {
      this.running = false;
    }
  }

  private executeMov(operands: string[]): void {
    const dest = operands[0];
    const src = operands[1];

    if (src.startsWith("#")) {
      const value = this.parseImmediate(src);
      this.setRegister(dest, value);
    } else {
      const value = this.getRegister(src);
      this.setRegister(dest, value);
    }

    this.pc++;
  }

  private executeAdd(operands: string[]): void {
    const dest = operands[0];
    const src1 = operands[1];
    const src2 = operands[2];

    const val1 = this.getRegister(src1);
    let val2: bigint;

    if (src2.startsWith("#")) {
      val2 = this.parseImmediate(src2);
    } else {
      val2 = this.getRegister(src2);
    }

    this.setRegister(dest, val1 + val2);
    this.pc++;
  }

  private executeSub(operands: string[]): void {
    const dest = operands[0];
    const src1 = operands[1];
    const src2 = operands[2];

    const val1 = this.getRegister(src1);
    let val2: bigint;

    if (src2.startsWith("#")) {
      val2 = this.parseImmediate(src2);
    } else {
      val2 = this.getRegister(src2);
    }

    this.setRegister(dest, val1 - val2);
    this.pc++;
  }

  private executeMul(operands: string[]): void {
    const dest = operands[0];
    const src1 = operands[1];
    const src2 = operands[2];

    const val1 = this.getRegister(src1);
    const val2 = this.getRegister(src2);

    this.setRegister(dest, val1 * val2);
    this.pc++;
  }

  private executeLdr(operands: string[]): void {
    const dest = operands[0];
    const src = operands[1];

    const address = this.parseMemoryOperand(src);
    const value = this.loadFromMemory(address);
    this.setRegister(dest, value);

    this.pc++;
  }

  private executeStr(operands: string[]): void {
    const src = operands[0];
    const dest = operands[1];

    const value = this.getRegister(src);
    const address = this.parseMemoryOperand(dest);
    this.storeToMemory(address, value);

    this.pc++;
  }

  private executeStp(operands: string[]): void {
    const reg1 = operands[0];
    const reg2 = operands[1];
    const memOp = operands[2];

    const val1 = this.getRegister(reg1);
    const val2 = this.getRegister(reg2);
    const baseAddr = this.parseMemoryOperand(memOp);

    this.storeToMemory(baseAddr, val1);
    this.storeToMemory(baseAddr + 8n, val2);

    this.pc++;
  }

  private executeLdp(operands: string[]): void {
    const reg1 = operands[0];
    const reg2 = operands[1];
    const memOp = operands[2];

    const baseAddr = this.parseMemoryOperand(memOp);
    const val1 = this.loadFromMemory(baseAddr);
    const val2 = this.loadFromMemory(baseAddr + 8n);

    this.setRegister(reg1, val1);
    this.setRegister(reg2, val2);

    this.pc++;
  }

  private executeBl(operands: string[]): void {
    const target = operands[0];

    if (target === "_printf") {
      this.handlePrintf();
    } else if (target === "_exit") {
      this.running = false;
      return;
    } else {
      this.setRegister("x30", BigInt(this.pc + 1));
      this.callStack.push(this.pc + 1);

      const targetLabel = target.startsWith("_") ? target : `_${target}`;
      const targetPC = this.labels.get(targetLabel);

      if (targetPC !== undefined) {
        this.pc = targetPC;
        return;
      }
    }

    this.pc++;
  }

  private executeRet(): void {
    if (this.callStack.length > 0) {
      this.pc = this.callStack.pop()!;
    } else {
      this.running = false;
    }
  }

  private executeCmp(operands: string[]): void {
    const reg1 = operands[0];
    const reg2 = operands[1];

    const val1 = this.getRegister(reg1);
    let val2: bigint;

    if (reg2.startsWith("#")) {
      val2 = this.parseImmediate(reg2);
    } else {
      val2 = this.getRegister(reg2);
    }

    this.registers.set("_cmp_result", val1 - val2);
    this.pc++;
  }

  private executeBranch(opcode: string, operands: string[]): void {
    const target = operands[0];
    const cmpResult = this.registers.get("_cmp_result") || 0n;

    let shouldBranch = false;

    switch (opcode) {
      case "beq":
        shouldBranch = cmpResult === 0n;
        break;
      case "bne":
        shouldBranch = cmpResult !== 0n;
        break;
      case "blt":
        shouldBranch = cmpResult < 0n;
        break;
      case "ble":
        shouldBranch = cmpResult <= 0n;
        break;
      case "bgt":
        shouldBranch = cmpResult > 0n;
        break;
      case "bge":
        shouldBranch = cmpResult >= 0n;
        break;
    }

    if (shouldBranch) {
      const targetPC = this.labels.get(target);
      if (targetPC !== undefined) {
        this.pc = targetPC;
        return;
      }
    }

    this.pc++;
  }

  private executeB(operands: string[]): void {
    const target = operands[0];
    const targetPC = this.labels.get(target);

    if (targetPC !== undefined) {
      this.pc = targetPC;
    } else {
      this.pc++;
    }
  }

  private executeCset(operands: string[]): void {
    const dest = operands[0];
    const condition = operands[1];

    const cmpResult = this.registers.get("_cmp_result") || 0n;
    let conditionMet = false;

    switch (condition.toLowerCase()) {
      case "eq":
        conditionMet = cmpResult === 0n;
        break;
      case "ne":
        conditionMet = cmpResult !== 0n;
        break;
      case "lt":
        conditionMet = cmpResult < 0n;
        break;
      case "le":
        conditionMet = cmpResult <= 0n;
        break;
      case "gt":
        conditionMet = cmpResult > 0n;
        break;
      case "ge":
        conditionMet = cmpResult >= 0n;
        break;
      case "cs":
      case "hs":
        conditionMet = cmpResult >= 0n;
        break;
      case "cc":
      case "lo":
        conditionMet = cmpResult < 0n;
        break;
      case "mi":
        conditionMet = cmpResult < 0n;
        break;
      case "pl":
        conditionMet = cmpResult >= 0n;
        break;
      case "vs":
      case "vc":
        /* not implemented so return false */
        conditionMet = false;
        break;
      case "hi":
        conditionMet = cmpResult > 0n;
        break;
      case "ls":
        conditionMet = cmpResult <= 0n;
        break;
      default:
        throw new Error(`Unknown condition code: ${condition}`);
    }

    this.setRegister(dest, conditionMet ? 1n : 0n);
    this.pc++;
  }

  private handlePrintf(): void {
    const value = this.getRegister("x0");
    this.output.push(value.toString());
  }

  private parseMemoryOperand(operand: string): bigint {
    /*[reg], [reg, #offset], [reg, #-offset] formats*/
    const cleaned = operand.replace(/[\[\]]/g, "");

    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map((p) => p.trim());
      const baseReg = parts[0];
      const offset = this.parseImmediate(parts[1]);

      return this.getRegister(baseReg) + offset;
    } else {
      return this.getRegister(cleaned);
    }
  }

  private parseImmediate(immediate: string): bigint {
    const cleaned = immediate.replace("#", "");

    if (cleaned.startsWith("0x")) {
      return BigInt(cleaned);
    } else {
      return BigInt(cleaned);
    }
  }

  private getRegister(name: string): bigint {
    if (name === "sp") {
      return this.stackPointer;
    }

    return this.registers.get(name) || 0n;
  }

  private setRegister(name: string, value: bigint): void {
    this.registers.set(name, value);

    if (name === "sp") {
      this.stackPointer = value;
    } else if (name === "x29") {
      this.framePointer = value;
    } else if (name === "x30") {
      this.linkRegister = value;
    }
  }

  private loadFromMemory(address: bigint): bigint {
    return this.stack.get(address) || 0n;
  }

  private storeToMemory(address: bigint, value: bigint): void {
    this.stack.set(address, value);
  }

  /*debug */
  public getState(): InterpreterState {
    return {
      registers: Object.fromEntries(this.registers),
      stackPointer: this.stackPointer,
      framePointer: this.framePointer,
      pc: this.pc,
      output: this.output.join("\n"),
      running: this.running,
    };
  }

  public reset(): void {
    this.initializeRegisters();
    this.stack.clear();
    this.instructions = [];
    this.labels.clear();
    this.stringLiterals.clear();
    this.output = [];
    this.pc = 0;
    this.running = false;
    this.callStack = [];
    this.stackPointer = 0x7fff_0000n;
    this.framePointer = 0x7fff_0000n;
    this.linkRegister = 0n;
  }
}

interface Instruction {
  opcode: string;
  operands: string[];
  original: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  returnValue: number;
  steps: number;
}

interface InterpreterState {
  registers: Record<string, bigint>;
  stackPointer: bigint;
  framePointer: bigint;
  pc: number;
  output: string;
  running: boolean;
}

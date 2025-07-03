import {
  BinaryExpression,
  BlockStatement,
  Expression,
  FunctionCall,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  NodeType,
  NumberLiteral,
  Program,
  ReturnStatement,
  Statement,
  UnaryExpression,
  WhileStatement,
} from "./parser";

/* linear-scan register allocator: real compilers use graph coloring with interference analysis
int result = (a + b) * (c + d) * (e + f);
// Evaluate (a + b)
generateExpression(a)     // → x0
leftReg = allocate()      // → x8, move x0 to x8
generateExpression(b)     // → x0
rightReg = allocate()     // → x9, move x0 to x9
// Perform: add x0, x8, x9
release(x8), release(x9)  // x8, x9 back to pool

// Evaluate (c + d)
leftReg = allocate()      // → x8 (reused!)
rightReg = allocate()     // → x9 (reused!)
// ... and so on
*/

class RegisterAllocator {
  /* fixed pool of callee-saved registers */
  private availableRegs = [
    "x8",
    "x9",
    "x10",
    "x11",
    "x12",
    "x13",
    "x14",
    "x15",
  ];
  private usedRegs: string[] = [];

  /* first-available allocation*/
  allocate(): string {
    if (this.availableRegs.length === 0) {
      throw new Error("No more registers available - expression too complex");
    }
    const reg = this.availableRegs.shift()!;
    this.usedRegs.push(reg);
    return reg;
  }

  /* simple pool-based deallocation: real allocators track live ranges and interference */
  release(reg: string): void {
    const index = this.usedRegs.indexOf(reg);
    if (index !== -1) {
      this.usedRegs.splice(index, 1);
      this.availableRegs.unshift(reg);
    }
  }

  /* per-function reset: real compilers maintain global register state across optimization passes */
  reset(): void {
    this.availableRegs = ["x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15"];
    this.usedRegs = [];
  }

  /* fallback detection for stack-based code generation when no registers are available*/
  hasAvailable(): boolean {
    return this.availableRegs.length > 0;
  }
}

export class ARM64CodeGenerator {
  private ast!: Program;
  private output: string[] = [];
  private currentFunction: string = "";
  private functionEndLabel: string = "";

  private varLocationMap: Map<string, Map<string, number>> = new Map();

  /* String literal pooling - avoids duplicate string constants in output */
  private stringLiterals: Map<string, string> = new Map();
  private labelCounter: number = 0;
  private stringLiteralCounter: number = 0;
  private regAlloc: RegisterAllocator = new RegisterAllocator();

  private nextOffsetMap: Map<string, number> = new Map();

  /* because there is no way i'm writing a linker, we're going to
    cheat and hardcode the routines, where we'd otherwise need to
    generate symbol references resolved at link time */
  private specialFunctions: Record<string, (args: Expression[]) => string[]> = {
    printf: (args: Expression[]) => {
      const formatString = "%ld\\n";
      const label = this.addStringLiteral(formatString);

      if (args[0].type === NodeType.UnaryExpression) {
        const unaryExpr = args[0] as UnaryExpression;

        if (
          unaryExpr.operator === "&" &&
          unaryExpr.operand.type === NodeType.Identifier
        ) {
          const varName = (unaryExpr.operand as Identifier).name;

          const offset = this.getVarLocation(this.currentFunction, varName);

          if (offset) {
            return [
              `\tldr\tx8, [sp, #${offset}]`,

              `\tldr\tx0, [x8]`,

              /* arm64 calling convention setup for variadic functions */
              "mov x9, sp",
              "mov x8, x0",
              "str x8, [x9]",
              `adrp x0, ${label}@PAGE`,
              `add x0, x0, ${label}@PAGEOFF`,
              "bl _printf",
            ];
          }
        }
      }

      const argCode = this.generateExpression(args[0]);

      return [
        ...argCode,
        "mov x9, sp",
        "mov x8, x0",
        "str x8, [x9]",
        `adrp x0, ${label}@PAGE`,
        `add x0, x0, ${label}@PAGEOFF`,
        "bl _printf",
      ];
    },
    exit: (args: Expression[]) => {
      const result: string[] = [];

      if (args.length !== 1) {
        throw new Error("exit() requires exactly one argument (exit code)");
      }

      const exitCodeExpression = this.generateExpression(args[0]);
      result.push(...exitCodeExpression);

      /* direct system call instead of library function */
      result.push("\tmov\tx16, #1");
      result.push("\tsvc\t#0x80");

      return result;
    },
  };

  load(ast: Program): ARM64CodeGenerator {
    this.output = [];
    this.varLocationMap.clear();
    this.stringLiterals.clear();
    this.labelCounter = 0;
    this.stringLiteralCounter = 0;
    this.nextOffsetMap.clear();
    this.ast = ast;
    return this;
  }

  run(): string {
    if (!this.ast) {
      throw new Error("No ast loaded in code generator");
    }

    /* assembly file header with target-specific boilerplate */
    this.addLine("\t.section\t__TEXT,__text,regular,pure_instructions");
    this.addLine("\t.build_version macos, 15, 0\tsdk_version 15, 4");

    for (const func of this.ast.functions) {
      this.generateFunction(func);
    }

    /* generate string literal section */
    if (this.stringLiterals.size > 0) {
      this.addLine("");
      this.addLine("\t.section\t__TEXT,__cstring,cstring_literals");

      for (const [label, value] of this.stringLiterals.entries()) {
        this.addLine(`${label}:`);
        this.addLine(`\t.asciz\t"${value}"`);
      }

      this.addLine(".subsections_via_symbols");
    }

    return this.output.join("\n");
  }

  private generateAssignmentStatement(stmt: any): void {
    /* generate rvalue first to ensures proper evaluation order */
    const valueCode = this.generateExpression(stmt.value);
    this.addLines(valueCode);

    if (typeof stmt.target === "string") {
      const offset = this.getVarLocation(this.currentFunction, stmt.target);
      if (!offset) {
        throw new Error(
          `Variable not found: ${stmt.target} in function ${this.currentFunction}`,
        );
      }

      this.addLine(`\tstr\tx0, [sp, #${offset}]`);
    } else if (
      stmt.target.type === NodeType.UnaryExpression &&
      stmt.target.operator === "*"
    ) {
      this.addLine(`\tmov\tx8, x0`);

      /* generate address computation for pointer target */
      const ptrCode = this.generateExpression(stmt.target.operand);
      this.addLines(ptrCode);

      /* store value at computed address - demonstrates pointer semantics */
      this.addLine(`\tstr\tx8, [x0]`);
    } else {
      throw new Error("Invalid assignment target");
    }
  }

  private countLocalVariables(block: BlockStatement): number {
    let count = 0;

    for (const stmt of block.statements) {
      count += this.countVariablesInStatement(stmt);
    }

    return count;
  }

  private countVariablesInStatement(stmt: Statement): number {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        return 1;

      case NodeType.BlockStatement:
        return this.countLocalVariables(stmt);

      case NodeType.IfStatement:
        let ifCount = 0;
        if (stmt.thenBranch.type === NodeType.BlockStatement) {
          ifCount += this.countLocalVariables(stmt.thenBranch);
        } else {
          ifCount += this.countVariablesInStatement(stmt.thenBranch);
        }

        if (stmt.elseBranch) {
          if (stmt.elseBranch.type === NodeType.BlockStatement) {
            ifCount += this.countLocalVariables(stmt.elseBranch);
          } else {
            ifCount += this.countVariablesInStatement(stmt.elseBranch);
          }
        }
        return ifCount;

      case NodeType.WhileStatement:
        if (stmt.body.type === NodeType.BlockStatement) {
          return this.countLocalVariables(stmt.body);
        } else {
          return this.countVariablesInStatement(stmt.body);
        }

      default:
        return 0;
    }
  }

  private calculateStackSizeForFunction(func: FunctionDeclaration): number {
    const baseStackSize = 32;
    /*
      base stack includes:
      return address 8 bytes,
      frame pointer 8 bytes
      spill space for register saves 16 bytes;
   */

    /* arm64 requires 8-byte alignment for parameters for up to 8 parameters*/
    const parameterSpace = Math.max(32, func.params.length * 8);

    /* required space for variables in frame */
    const localVarCount = this.countLocalVariables(func.body);
    const localVarSpace = localVarCount * 8;
    const tempSpace = 32;

    /* arm64 abi requires 16-byte stack alignment */
    const total = baseStackSize + parameterSpace + localVarSpace + tempSpace;
    return Math.ceil(total / 16) * 16;
  }

  private generateFunction(func: FunctionDeclaration): void {
    this.currentFunction = func.name;
    /* per-function symbol table: real compilers use global scope analysis */
    this.varLocationMap.set(func.name, new Map());

    /* unique label generation for function cleanup prevents label conflicts */
    this.functionEndLabel = this.generateLabel("function_end");

    this.regAlloc.reset();

    this.nextOffsetMap.set(func.name, 16);

    this.addLine(
      `\t.globl\t_${func.name}\t\t\t\t\t ; -- Begin function ${func.name}`,
    );
    this.addLine("\t.p2align\t2");
    this.addLine(`_${func.name}:\t\t\t\t\t\t ; @${func.name}`);

    const totalStackSize = this.calculateStackSizeForFunction(func);

    /* standard arm64 function prologue to save frame pointer and return address */
    this.addLine(`\tsub\tsp, sp, #${totalStackSize}`);
    this.addLine(`\tstp\tx29, x30, [sp, #${totalStackSize - 16}]`);
    this.addLine(`\tadd\tx29, sp, #${totalStackSize - 16}`);

    /*
    High Memory Addresses
    ┌─────────────────┐
    │   Other Data    │
    ├─────────────────┤
    │  Stack Frame N  │             ← Previous function's frame
    ├─────────────────┤
    │ Return Address  │             ← Where to return after current function
    │ Saved x29 (FP)  │             ← Previous frame pointer
    ├─────────────────┤  ← x29 (Frame Pointer) points here
    │                 │
    │  Local Vars     │             ← Variables allocated here
    │   (growing      │
    │   downward)     │
    ├─────────────────┤  ← Stack Pointer (SP) moves as stack grows
    │  Free Stack     │
    │   Space         │
    └─────────────────┘
    Low Memory Addresses

    */

    /* parameter storage */
    for (let i = 0; i < func.params.length; i++) {
      const param = func.params[i];
      const offset = this.allocateStackSlot(func.name);

      this.setVarLocation(func.name, param.name, offset);

      /* arm64 calling convention: first 8 parameters in x0-x7 */
      if (i < 8) {
        this.addLine(`\tstr\tx${i}, [sp, #${offset}]`);
      } else {
        /* limitation: no support for stack-passed parameters */
        throw new Error(
          `Function ${func.name} has more than 8 parameters, which is not supported`,
        );
      }
    }

    this.generateBlock(func.body);

    /* function end label placement */
    this.addLine(`${this.functionEndLabel}:`);

    /* matching epilogue restoring saved registers and deallocates stack */
    this.addLine(`\tldp\tx29, x30, [sp, #${totalStackSize - 16}]`);
    this.addLine(`\tadd\tsp, sp, #${totalStackSize}`);

    /* return instruction */
    this.addLine("\tret");
    this.addLine("\t\t\t\t\t\t\t ; -- End function");
  }

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateReturnStatement(stmt: ReturnStatement): void {
    if (stmt.type == NodeType.ReturnStatement) {
      const exprCode = this.generateExpression(stmt.argument);
      this.addLines(exprCode);
      /* return value in x0 */
    }

    /* jump to function end for consistent cleanup to reuse epilogue code */
    this.addLine(`\tb\t${this.functionEndLabel}`);
  }

  /* visitor pattern for code generation */
  private generateStatement(stmt: Statement): void {
    switch (stmt.type) {
      case NodeType.ReturnStatement:
        this.generateReturnStatement(stmt);
        break;
      case NodeType.BlockStatement:
        this.generateBlock(stmt);
        break;
      case NodeType.VariableDeclaration:
        const offset = this.allocateStackSlot(this.currentFunction);
        this.setVarLocation(this.currentFunction, stmt.name, offset);

        if (stmt.init.type === NodeType.NumberLiteral) {
          this.addLine(
            `\tmov\tx8, #${stmt.init.value}\t\t\t\t; =0x${stmt.init.value.toString(16)}`,
          );
          this.addLine(`\tstr\tx8, [sp, #${offset}]`);
        } else {
          const initCode = this.generateExpression(stmt.init);
          this.addLines(initCode);
          this.addLine(`\tstr\tx0, [sp, #${offset}]`);
        }
        break;

      case NodeType.ExpressionStatement:
        const exprCode = this.generateExpression(stmt.expression);
        this.addLines(exprCode);
        break;
      case NodeType.AssignmentStatement:
        this.generateAssignmentStatement(stmt);
        break;
      case NodeType.IfStatement:
        this.generateIfStatement(stmt);
        break;

      case NodeType.WhileStatement:
        this.generateWhileStatement(stmt);
        break;
    }
  }

  /* Stack slot allocation - demonstrates memory layout management */
  private allocateStackSlot(funcName: string): number {
    /*
   x29 (Frame Pointer) →  ┌─────────────────┐
                          │  Saved Data     │          |
                          ├─────────────────┤
   [x29, #-8]  →          │   Variable 1    │← 8 bytes |
                          ├─────────────────┤
   [x29, #-16] →          │   Variable 2    │← 8 bytes |
                          ├─────────────────┤
   [x29, #-24] →          │   Variable 3    │← 8 bytes |
                          ├─────────────────┤
                          │   Free Space    │          |
   */

    const currentOffset = this.nextOffsetMap.get(funcName)!;
    this.nextOffsetMap.set(funcName, currentOffset + 8);

    return currentOffset;
  }

  private generateWhileStatement(stmt: WhileStatement): void {
    const loopStart = this.generateLabel("loop_start");
    const loopEnd = this.generateLabel("loop_end");

    /* target for continue statements */
    this.addLine(`${loopStart}:`);

    /* determines loop continuation */
    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    /*  compare and branch pattern */
    this.addLine("\tcmp\tx0, #0");
    this.addLine(`\tbeq\t${loopEnd}`);

    if (stmt.body.type === NodeType.BlockStatement) {
      this.generateBlock(stmt.body);
    } else {
      this.generateStatement(stmt.body);
    }

    /* branch back to condition check */
    this.addLine(`\tb\t${loopStart}`);

    /* target for break statements */
    this.addLine(`${loopEnd}:`);
  }

  private generateIfStatement(stmt: IfStatement): void {
    const endLabel = this.generateLabel("endif");
    const elseLabel = stmt.elseBranch ? this.generateLabel("else") : endLabel;

    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    /* branch based on false condition */
    this.addLine("\tcmp\tx0, #0");
    this.addLine(`\tbeq\t${elseLabel}`);

    /* then branch code generation */
    if (stmt.thenBranch.type === NodeType.BlockStatement) {
      this.generateBlock(stmt.thenBranch);
    } else {
      this.generateStatement(stmt.thenBranch);
    }

    /* skip else branch if then branch executed */
    if (stmt.elseBranch) {
      this.addLine(`\tb\t${endLabel}`);
      this.addLine(`${elseLabel}:`);

      if (stmt.elseBranch.type === NodeType.BlockStatement) {
        this.generateBlock(stmt.elseBranch);
      } else {
        this.generateStatement(stmt.elseBranch);
      }
    }

    /* common exit point for both branches */
    this.addLine(`${endLabel}:`);
  }

  /* recursive descent pattern */
  private generateExpression(expr: Expression): string[] {
    switch (expr.type) {
      case NodeType.BinaryExpression:
        return this.generateBinaryExpression(expr);
      case NodeType.UnaryExpression:
        return this.generateUnaryExpression(expr);
      case NodeType.FunctionCall:
        return this.generateFunctionCall(expr);
      case NodeType.Identifier:
        return this.generateIdentifier(expr);
      case NodeType.NumberLiteral:
        return this.generateNumberLiteral(expr);
      case NodeType.VoidExpression:
        return [];
      default:
        return [];
    }
  }

  private generateUnaryExpression(expr: UnaryExpression): string[] {
    const result: string[] = [];

    switch (expr.operator) {
      case "&":
        if (expr.operand.type === NodeType.Identifier) {
          /* address calculation: lvalue to rvalue conversion */
          const offset = this.getVarLocation(
            this.currentFunction,
            expr.operand.name,
          );
          if (!offset) {
            throw new Error(`Variable not found: ${expr.operand.name}`);
          }

          /* address arithmetic: load effective address equivalent */

          result.push(`\tadd\tx0, sp, #${offset}`);
        } else {
          throw new Error(
            "Address-of operator can only be applied to variables",
          );
        }
        break;

      case "*":
        /* pointer dereferencing */
        const addressCode = this.generateExpression(expr.operand);
        result.push(...addressCode);
        /* load value from computed address */
        result.push(`\tldr\tx0, [x0]`);
        break;

      default:
        throw new Error(`Unsupported unary operator: ${expr.operator}`);
    }

    return result;
  }

  private generateBinaryExpression(expr: BinaryExpression): string[] {
    const result: string[] = [];

    /* check we have registers available */
    if (!this.regAlloc.hasAvailable()) {
      return this.generateBinaryExpressionStackBased(expr);
    }

    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    /* register allocation for intermediate results */
    const leftReg = this.regAlloc.allocate();
    result.push(`\tmov\t${leftReg}, x0`);

    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);

    const rightReg = this.regAlloc.allocate();
    result.push(`\tmov\t${rightReg}, x0`);

    switch (expr.operator) {
      case "*":
        result.push(`\tmul\tx0, ${leftReg}, ${rightReg}`);
        break;
      case "+":
        result.push(`\tadd\tx0, ${leftReg}, ${rightReg}`);
        break;
      case "-":
        result.push(`\tsub\tx0, ${leftReg}, ${rightReg}`);
        break;
      case "/":
        result.push(`\tsdiv\tx0, ${leftReg}, ${rightReg}`);
        break;
      case "<":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, lt");
        break;
      case ">":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, gt");
        break;
      case "==":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, eq");
        break;
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }

    /* release registers */
    this.regAlloc.release(leftReg);
    this.regAlloc.release(rightReg);

    return result;
  }

  /* stack-based expression evaluation for when no available registers */
  private generateBinaryExpressionStackBased(expr: BinaryExpression): string[] {
    const result: string[] = [];

    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    result.push("\tsub\tsp, sp, #16");
    result.push("\tstr\tx0, [sp]");

    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);
    result.push("\tmov\tx9, x0");

    result.push("\tldr\tx8, [sp]");
    result.push("\tadd\tsp, sp, #16");

    switch (expr.operator) {
      case "*":
        result.push("\tmul\tx0, x8, x9");
        break;
      case "+":
        result.push("\tadd\tx0, x8, x9");
        break;
      case "-":
        result.push("\tsub\tx0, x8, x9");
        break;
      case "/":
        result.push("\tsdiv\tx0, x8, x9");
        break;
      case "<":
        result.push("\tcmp\tx8, x9");
        result.push("\tcset\tx0, lt");
        break;
      case ">":
        result.push("\tcmp\tx8, x9");
        result.push("\tcset\tx0, gt");
        break;
      case "==":
        result.push("\tcmp\tx8, x9");
        result.push("\tcset\tx0, eq");
        break;
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }

    return result;
  }

  private generateFunctionCall(expr: FunctionCall): string[] {
    /* special function handling to avoid full symbol resolution */
    if (expr.callee in this.specialFunctions) {
      return this.specialFunctions[expr.callee](expr.arguments);
    }

    const result: string[] = [];

    /*
    ARM64 calling convention has the first 8 parameters passed i in the registers x0-x7
    (v0-v7 for floating point), and stack based after that.
    int func(int a, int b, int c, int d, int e, int f, int g, int h, int i, int j);
             x0     x1     x2     x3     x4     x5     x6     x7     stack  stack
    */
    if (expr.arguments.length > 8) {
      throw new Error("More than 8 function arguments not supported");
    }

    if (expr.arguments.length === 0) {
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    if (expr.arguments.length === 1) {
      const argCode = this.generateExpression(expr.arguments[0]);
      result.push(...argCode);
      /* Argument already in x0 - ARM64 first parameter register */
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    const tempStackOffsets: number[] = [];

    for (let i = 0; i < expr.arguments.length; i++) {
      const argCode = this.generateExpression(expr.arguments[i]);
      result.push(...argCode);

      const tempOffset = this.allocateStackSlot(this.currentFunction);
      tempStackOffsets.push(tempOffset);

      result.push(`\tstr\tx0, [sp, #${tempOffset}]`);
    }

    /* load arguments into parameter registers x0-x7 */
    for (let i = 0; i < expr.arguments.length; i++) {
      const tempOffset = tempStackOffsets[i];
      result.push(`\tldr\tx${i}, [sp, #${tempOffset}]`);
    }

    /* function call with properly loaded arguments */
    result.push(`\tbl\t_${expr.callee}`);

    return result;
  }

  /* variable access code generation; symbol table lookup */
  private generateIdentifier(expr: Identifier): string[] {
    const offset = this.getVarLocation(this.currentFunction, expr.name);

    if (!offset) {
      throw new Error(
        `Variable not found: ${expr.name} in function ${this.currentFunction}`,
      );
    }

    return [`\tldr\tx0, [sp, #${offset}]`];
  }

  /* literal constant loading; demonstrates immediate value handling */
  private generateNumberLiteral(expr: NumberLiteral): string[] {
    /*
    In ARM64 assembly, when you write mov x0, #123, you're asking the processor to load the literal value 123 directly into register x0.
    The problem is that ARM64 instructions have a fixed 32-bit width, and they need to encode the operation, destination register, and the immediate value itself.

    So certain numbers are just to big to be used as immediates without extra plumbing.

    mov x0, #0x1234              ; OK - fits in 16 bits
    mov x0, #0x12340000          ; OK - 16-bit value shifted left
    mov x0, #0x1234000000000000  ; OK - 16-bit value in high position
    mov x0, #0xFFFFFFFFFFFFFFFF  ; OK - all ones (special encoding)
    mov x0, #0x123456789ABCDEF0  ; FAILS - too large and complex
    mov x0, #0x12345678          ; FAILS - can't be encoded as shifted 16-bit value
    mov x0, #0x1234567890ABCDEF  ; FAILS - no valid encoding pattern


    For large constants real compile might generate a sequence like:
    movz x0, #0x1234, lsl #48    ; Load high 16 bits
    movk x0, #0x5678, lsl #32    ; Insert next 16 bits
    movk x0, #0x9ABC, lsl #16    ; Insert next 16 bits
    movk x0, #0xDEF0             ; Insert low 16 bits

    We however, will not.
   */
    return [`\tmov\tx0, #${expr.value}\t\t\t\t; =0x${expr.value.toString(16)}`];
  }

  private generateLabel(prefix: string): string {
    const label = `L${this.labelCounter++}_${prefix}`;
    return label;
  }

  private addLine(line: string): void {
    this.output.push(line);
  }

  private addLines(lines: string[]): void {
    this.output.push(...lines);
  }

  /* variable location tracking; maintains symbol table per function */
  private setVarLocation(
    funcName: string,
    varName: string,
    offset: number,
  ): void {
    let varMap = this.varLocationMap.get(funcName);

    if (!varMap) {
      varMap = new Map();
      this.varLocationMap.set(funcName, varMap);
    }

    varMap.set(varName, offset);
  }

  private getVarLocation(
    funcName: string,
    varName: string,
  ): number | undefined {
    const varMap = this.varLocationMap.get(funcName);

    if (!varMap) {
      return undefined;
    }

    return varMap.get(varName);
  }

  private addStringLiteral(value: string): string {
    const label = `l_.str.${this.stringLiteralCounter++}`;
    this.stringLiterals.set(label, value);
    return label;
  }
}

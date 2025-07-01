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

/* Simple linear-scan register allocator - real compilers use graph coloring with interference analysis */
class RegisterAllocator {
  /* Fixed pool of callee-saved registers - real allocators consider register classes and calling conventions */
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

  /* First-available allocation strategy - real compilers use sophisticated cost models */
  allocate(): string {
    if (this.availableRegs.length === 0) {
      throw new Error("No more registers available - expression too complex");
    }
    const reg = this.availableRegs.shift()!;
    this.usedRegs.push(reg);
    return reg;
  }

  /* Simple pool-based deallocation - real allocators track live ranges and interference */
  release(reg: string): void {
    const index = this.usedRegs.indexOf(reg);
    if (index !== -1) {
      this.usedRegs.splice(index, 1);
      this.availableRegs.unshift(reg);
    }
  }

  /* Per-function reset - real compilers maintain global register state across optimization passes */
  reset(): void {
    this.availableRegs = ["x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15"];
    this.usedRegs = [];
  }

  /* Fallback detection for stack-based code generation when registers exhausted */
  hasAvailable(): boolean {
    return this.availableRegs.length > 0;
  }
}

export class ARM64CodeGenerator {
  private output: string[] = [];
  private currentFunction: string = "";
  private functionEndLabel: string = "";

  /* Stack frame layout tracking - real compilers use sophisticated frame analysis */
  private varLocationMap: Map<string, Map<string, number>> = new Map();

  /* String literal pooling - avoids duplicate string constants in output */
  private stringLiterals: Map<string, string> = new Map();
  private labelCounter: number = 0;
  private stringLiteralCounter: number = 0;
  private regAlloc: RegisterAllocator = new RegisterAllocator();

  /* Per-function stack offset tracking - real compilers do global stack frame optimization */
  private nextOffsetMap: Map<string, number> = new Map();

  /* Hard-coded external function implementations - avoids implementing a full linker */
  /* Real compilers generate symbol references resolved at link time */
  private specialFunctions: Record<string, (args: Expression[]) => string[]> = {
    printf: (args: Expression[]) => {
      const formatString = "%ld\\n";
      const label = this.addStringLiteral(formatString);

      /* Special case handling for address-of expressions - demonstrates pointer dereferencing */
      if (args[0].type === "UnaryExpression") {
        const unaryExpr = args[0] as UnaryExpression;

        if (
          unaryExpr.operator === "&" &&
          unaryExpr.operand.type === "Identifier"
        ) {
          const varName = (unaryExpr.operand as Identifier).name;

          /* Manual pointer dereferencing - real compilers have sophisticated pointer analysis */
          const offset = this.getVarLocation(this.currentFunction, varName);

          if (offset) {
            return [
              /* Load pointer value then dereference - demonstrates two-level memory access */

              `\tldr\tx8, [sp, #${offset}]`,

              `\tldr\tx0, [x8]`,

              /* ARM64 calling convention setup for variadic functions */
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

      /* Standard printf call generation - demonstrates function call code generation */
      const argCode = this.generateExpression(args[0]);

      return [
        ...argCode,
        /* ARM64 variadic function calling convention requires stack setup */
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

      /* System call generation - real compilers would use library functions */
      const exitCodeExpression = this.generateExpression(args[0]);
      result.push(...exitCodeExpression);

      /* Direct system call instead of library function - educational simplification */
      result.push("\tmov\tx16, #1");
      result.push("\tsvc\t#0x80");

      return result;
    },
  };

  /* Main entry point - orchestrates the entire code generation process */
  generate(ast: Program): string {
    this.output = [];
    this.varLocationMap.clear();
    this.stringLiterals.clear();
    this.labelCounter = 0;
    this.stringLiteralCounter = 0;
    this.nextOffsetMap.clear();

    /* Assembly file header - target-specific boilerplate */
    this.addLine("\t.section\t__TEXT,__text,regular,pure_instructions");
    this.addLine("\t.build_version macos, 15, 0\tsdk_version 15, 4");

    /* Process each function in the program - demonstrates single-pass code generation */
    for (const func of ast.functions) {
      this.generateFunction(func);
    }

    /* Generate string literal section - demonstrates constant pooling */
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

  /* Assignment statement code generation - demonstrates lvalue/rvalue distinction */
  private generateAssignmentStatement(stmt: any): void {
    /* Generate rvalue first - ensures proper evaluation order */
    const valueCode = this.generateExpression(stmt.value);
    this.addLines(valueCode);

    if (typeof stmt.target === "string") {
      /* Simple variable assignment - most common case */
      const offset = this.getVarLocation(this.currentFunction, stmt.target);
      if (!offset) {
        throw new Error(
          `Variable not found: ${stmt.target} in function ${this.currentFunction}`,
        );
      }

      /* 64-bit store operations - demonstrates target architecture specificity */

      this.addLine(`\tstr\tx0, [sp, #${offset}]`);
    } else if (
      stmt.target.type === "UnaryExpression" &&
      stmt.target.operator === "*"
    ) {
      /* Pointer dereference assignment - demonstrates indirect memory access */
      this.addLine(`\tmov\tx8, x0`);

      /* Generate address computation for pointer target */
      const ptrCode = this.generateExpression(stmt.target.operand);
      this.addLines(ptrCode);

      /* Store value at computed address - demonstrates pointer semantics */
      this.addLine(`\tstr\tx8, [x0]`);
    } else {
      throw new Error("Invalid assignment target");
    }
  }

  /* Stack frame size calculation - real compilers use sophisticated frame analysis */
  private calculateStackSizeForFunction(func: FunctionDeclaration): number {
    /* Conservative estimation approach - real compilers do precise liveness analysis */
    const baseStackSize = 32;

    /* ARM64 requires 8-byte alignment for parameters */
    const parameterSpace = Math.max(
      32,
      Math.ceil((func.params.length * 8) / 8) * 8,
    );

    /* Fixed allocations - real compilers calculate exact requirements */
    const localVarSpace = 64;
    const tempSpace = 32;

    /* ARM64 ABI requires 16-byte stack alignment */
    const total = baseStackSize + parameterSpace + localVarSpace + tempSpace;
    return Math.ceil(total / 16) * 16;
  }

  /* Function code generation - demonstrates function prologue/epilogue patterns */

  private generateFunction(func: FunctionDeclaration): void {
    this.currentFunction = func.name;
    /* Per-function symbol table - real compilers use global scope analysis */
    this.varLocationMap.set(func.name, new Map());

    /* Unique label generation for function cleanup - prevents label conflicts */
    this.functionEndLabel = this.generateLabel("function_end");

    this.regAlloc.reset();

    /* Consistent stack layout for all functions */
    this.nextOffsetMap.set(func.name, 16);

    this.addLine(
      `\t.globl\t_${func.name}\t\t\t\t\t ; -- Begin function ${func.name}`,
    );
    this.addLine("\t.p2align\t2");
    this.addLine(`_${func.name}:\t\t\t\t\t\t ; @${func.name}`);

    /* Dynamic stack frame calculation for all functions */
    const totalStackSize = this.calculateStackSizeForFunction(func);

    /* Standard ARM64 function prologue - saves frame pointer and return address */
    this.addLine(`\tsub\tsp, sp, #${totalStackSize}`);
    this.addLine(`\tstp\tx29, x30, [sp, #${totalStackSize - 16}]`);
    this.addLine(`\tadd\tx29, sp, #${totalStackSize - 16}`);

    /* Parameter storage - implements ARM64 calling convention */
    for (let i = 0; i < func.params.length; i++) {
      const param = func.params[i];
      const offset = this.allocateStackSlot(func.name);

      this.setVarLocation(func.name, param.name, offset);

      /* ARM64 calling convention: first 8 parameters in x0-x7 */
      if (i < 8) {
        this.addLine(`\tstr\tx${i}, [sp, #${offset}]`);
      } else {
        /* Limitation: no support for stack-passed parameters */
        throw new Error(
          `Function ${func.name} has more than 8 parameters, which is not supported`,
        );
      }
    }

    this.generateBlock(func.body);

    /* Consistent function end label placement */
    this.addLine(`${this.functionEndLabel}:`);

    /* Matching epilogue - restores saved registers and deallocates stack */
    this.addLine(`\tldp\tx29, x30, [sp, #${totalStackSize - 16}]`);
    this.addLine(`\tadd\tsp, sp, #${totalStackSize}`);

    /* ARM64 function return instruction */
    this.addLine("\tret");
    this.addLine("\t\t\t\t\t\t\t ; -- End function");
  }
  /* Block statement processing - demonstrates sequential code generation */
  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  /* Return statement handling - demonstrates control flow management */
  private generateReturnStatement(stmt: ReturnStatement): void {
    /* Generate return value expression if present */
    if (stmt.type == NodeType.ReturnStatement) {
      const exprCode = this.generateExpression(stmt.argument);
      this.addLines(exprCode);
      /* ARM64 calling convention: return value in x0 */
    }

    /* Jump to function end for consistent cleanup - avoids duplicate epilogue code */
    this.addLine(`\tb\t${this.functionEndLabel}`);
  }

  /* Statement dispatcher - demonstrates visitor pattern for code generation */
  private generateStatement(stmt: Statement): void {
    switch (stmt.type) {
      case "ReturnStatement":
        this.generateReturnStatement(stmt);
        break;
      case "BlockStatement":
        this.generateBlock(stmt);
        break;
      case "VariableDeclaration":
        const offset = this.allocateStackSlot(this.currentFunction);
        this.setVarLocation(this.currentFunction, stmt.name, offset);

        if (stmt.init.type === "NumberLiteral") {
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

      case "ExpressionStatement":
        /* Expression statements for side effects - result value discarded */
        const exprCode = this.generateExpression(stmt.expression);
        this.addLines(exprCode);
        break;
      case "AssignmentStatement":
        this.generateAssignmentStatement(stmt);
        break;
      case "IfStatement":
        this.generateIfStatement(stmt);
        break;

      case "WhileStatement":
        this.generateWhileStatement(stmt);
        break;
    }
  }

  /* Stack slot allocation - demonstrates memory layout management */
  private allocateStackSlot(funcName: string): number {
    const currentOffset = this.nextOffsetMap.get(funcName)!;
    this.nextOffsetMap.set(funcName, currentOffset + 8);

    return currentOffset;
  }

  /* While loop code generation - demonstrates structured control flow */
  private generateWhileStatement(stmt: WhileStatement): void {
    const loopStart = this.generateLabel("loop_start");
    const loopEnd = this.generateLabel("loop_end");

    /* Loop entry point - target for continue statements */
    this.addLine(`${loopStart}:`);

    /* Condition evaluation - determines loop continuation */
    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    /* Conditional branch - ARM64 compare and branch pattern */
    this.addLine("\tcmp\tx0, #0");
    this.addLine(`\tbeq\t${loopEnd}`);

    /* Loop body generation - handles both single statements and blocks */
    if (stmt.body.type === "BlockStatement") {
      this.generateBlock(stmt.body);
    } else {
      this.generateStatement(stmt.body);
    }

    /* Unconditional branch back to condition check */
    this.addLine(`\tb\t${loopStart}`);

    /* Loop exit point - target for break statements */
    this.addLine(`${loopEnd}:`);
  }

  /* If statement code generation - demonstrates conditional control flow */
  private generateIfStatement(stmt: IfStatement): void {
    const endLabel = this.generateLabel("endif");
    const elseLabel = stmt.elseBranch ? this.generateLabel("else") : endLabel;

    /* Condition evaluation - boolean expression to ARM64 comparison */
    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    /* Conditional branch based on false condition - ARM64 branch-on-equal pattern */
    this.addLine("\tcmp\tx0, #0");
    this.addLine(`\tbeq\t${elseLabel}`);

    /* Then branch code generation */
    if (stmt.thenBranch.type === "BlockStatement") {
      this.generateBlock(stmt.thenBranch);
    } else {
      this.generateStatement(stmt.thenBranch);
    }

    /* Skip else branch if then branch executed */
    if (stmt.elseBranch) {
      this.addLine(`\tb\t${endLabel}`);
      this.addLine(`${elseLabel}:`);

      if (stmt.elseBranch.type === "BlockStatement") {
        this.generateBlock(stmt.elseBranch);
      } else {
        this.generateStatement(stmt.elseBranch);
      }
    }

    /* Common exit point for both branches */
    this.addLine(`${endLabel}:`);
  }

  /* Expression code generation dispatcher - demonstrates recursive descent pattern */
  private generateExpression(expr: Expression): string[] {
    switch (expr.type) {
      case "BinaryExpression":
        return this.generateBinaryExpression(expr);
      case "UnaryExpression":
        return this.generateUnaryExpression(expr);
      case "FunctionCall":
        return this.generateFunctionCall(expr);
      case "Identifier":
        return this.generateIdentifier(expr);
      case "NumberLiteral":
        return this.generateNumberLiteral(expr);
      case "VoidExpression":
        return [];
      default:
        return [];
    }
  }

  /* Unary expression handling - demonstrates address-of and dereference operations */
  private generateUnaryExpression(expr: UnaryExpression): string[] {
    const result: string[] = [];

    switch (expr.operator) {
      case "&":
        if (expr.operand.type === "Identifier") {
          /* Address calculation - demonstrates lvalue to rvalue conversion */
          const offset = this.getVarLocation(
            this.currentFunction,
            expr.operand.name,
          );
          if (!offset) {
            throw new Error(`Variable not found: ${expr.operand.name}`);
          }

          /* ARM64 address arithmetic - lea equivalent */

          result.push(`\tadd\tx0, sp, #${offset}`);
        } else {
          throw new Error(
            "Address-of operator can only be applied to variables",
          );
        }
        break;

      case "*":
        /* Pointer dereferencing - demonstrates indirect memory access */
        const addressCode = this.generateExpression(expr.operand);
        result.push(...addressCode);
        /* Load value from computed address - ARM64 indirect load */
        result.push(`\tldr\tx0, [x0]`);
        break;

      default:
        throw new Error(`Unsupported unary operator: ${expr.operator}`);
    }

    return result;
  }

  /* Binary expression code generation - demonstrates register allocation challenges */
  private generateBinaryExpression(expr: BinaryExpression): string[] {
    const result: string[] = [];

    /* Register availability check - fallback to stack-based evaluation */
    if (!this.regAlloc.hasAvailable()) {
      return this.generateBinaryExpressionStackBased(expr);
    }

    /* Left operand evaluation - demonstrates evaluation order */
    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    /* Register allocation for intermediate results */
    const leftReg = this.regAlloc.allocate();
    result.push(`\tmov\t${leftReg}, x0`);

    /* Right operand evaluation - may clobber x0 */
    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);

    /* Second register allocation */
    const rightReg = this.regAlloc.allocate();
    result.push(`\tmov\t${rightReg}, x0`);

    /* ARM64 arithmetic and comparison operations */
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
        /* Comparison operations produce boolean results */
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

    /* Register deallocation - returns registers to available pool */
    this.regAlloc.release(leftReg);
    this.regAlloc.release(rightReg);

    return result;
  }

  /* Stack-based expression evaluation - fallback when registers exhausted */
  private generateBinaryExpressionStackBased(expr: BinaryExpression): string[] {
    const result: string[] = [];

    /* Left operand evaluation and stack storage */
    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    /* Manual stack management - real compilers use virtual registers */
    result.push("\tsub\tsp, sp, #16");
    result.push("\tstr\tx0, [sp]");

    /* Right operand evaluation */
    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);
    result.push("\tmov\tx9, x0");

    /* Stack value restoration */
    result.push("\tldr\tx8, [sp]");
    result.push("\tadd\tsp, sp, #16");

    /* Same arithmetic operations as register-based version */
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

  /* Function call code generation - demonstrates calling convention implementation */
  private generateFunctionCall(expr: FunctionCall): string[] {
    /* Special function handling - avoids full symbol resolution */
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

    /* Zero-argument function calls - simplest case */
    if (expr.arguments.length === 0) {
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    /* Single argument optimization - avoids register juggling */
    if (expr.arguments.length === 1) {
      const argCode = this.generateExpression(expr.arguments[0]);
      result.push(...argCode);
      /* Argument already in x0 - ARM64 first parameter register */
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    /* Multiple argument handling - demonstrates parameter passing complexity */
    const tempStackOffsets: number[] = [];

    /* Argument evaluation and temporary storage - avoids register conflicts */
    for (let i = 0; i < expr.arguments.length; i++) {
      const argCode = this.generateExpression(expr.arguments[i]);
      result.push(...argCode);

      /* Temporary stack allocation for argument preservation */
      const tempOffset = this.allocateStackSlot(this.currentFunction);
      tempStackOffsets.push(tempOffset);

      /* Store argument result to temporary location - now consistent for all functions */
      result.push(`\tstr\tx0, [sp, #${tempOffset}]`);
    }

    /* Load arguments into ARM64 parameter registers x0-x7 */
    for (let i = 0; i < expr.arguments.length; i++) {
      const tempOffset = tempStackOffsets[i];
      result.push(`\tldr\tx${i}, [sp, #${tempOffset}]`);
    }

    /* Function call with properly loaded arguments */
    result.push(`\tbl\t_${expr.callee}`);

    return result;
  }

  /* Variable access code generation; symbol table lookup */
  private generateIdentifier(expr: Identifier): string[] {
    const offset = this.getVarLocation(this.currentFunction, expr.name);

    if (!offset) {
      throw new Error(
        `Variable not found: ${expr.name} in function ${this.currentFunction}`,
      );
    }

    return [`\tldr\tx0, [sp, #${offset}]`];
  }

  /* Literal constant loading; demonstrates immediate value handling */
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

  /* Unique label generation; prevents assembly-time conflicts */
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

  /* Variable location tracking; maintains symbol table per function */
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

  /* Variable location lookup and symbol resolution for code generation */
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

  /* String literal management; constant pooling for efficiency */
  private addStringLiteral(value: string): string {
    const label = `l_.str.${this.stringLiteralCounter++}`;
    this.stringLiterals.set(label, value);
    return label;
  }
}

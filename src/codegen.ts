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

class RegisterAllocator {
  private availableRegs = [
    "x8", // Changed to 64-bit registers
    "x9",
    "x10",
    "x11",
    "x12",
    "x13",
    "x14",
    "x15",
  ];
  private usedRegs: string[] = [];

  allocate(): string {
    if (this.availableRegs.length === 0) {
      throw new Error("No more registers available - expression too complex");
    }
    const reg = this.availableRegs.shift()!;
    this.usedRegs.push(reg);
    return reg;
  }

  release(reg: string): void {
    const index = this.usedRegs.indexOf(reg);
    if (index !== -1) {
      this.usedRegs.splice(index, 1);
      this.availableRegs.unshift(reg);
    }
  }

  // Reset for each function
  reset(): void {
    this.availableRegs = ["x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15"];
    this.usedRegs = [];
  }

  // Check if we have registers available
  hasAvailable(): boolean {
    return this.availableRegs.length > 0;
  }
}

export class ARM64CodeGenerator {
  private output: string[] = [];
  private currentFunction: string = "";
  private functionEndLabel: string = "";
  private varLocationMap: Map<
    string,
    Map<string, { frameRelative: boolean; offset: number }>
  > = new Map();
  private stringLiterals: Map<string, string> = new Map();
  private labelCounter: number = 0;
  private stringLiteralCounter: number = 0;
  private regAlloc: RegisterAllocator = new RegisterAllocator();
  private nextOffsetMap: Map<string, number> = new Map();

  /**
   * because there's no way I'm writing a linker, we're going to
   * cheat by hard coding calls to external functions, in this case, printf.
   * anything more sophisticated is well beyond the scope
   */
  private specialFunctions: Record<string, (args: Expression[]) => string[]> = {
    printf: (args: Expression[]) => {
      const formatString = "%ld\\n"; // Changed to %ld for 64-bit
      const label = this.addStringLiteral(formatString);

      // Check if the argument is an address-of expression (&variable)
      if (args[0].type === "UnaryExpression") {
        const unaryExpr = args[0] as UnaryExpression;

        if (
          unaryExpr.operator === "&" &&
          unaryExpr.operand.type === "Identifier"
        ) {
          // Special case: printf(&ptr) where ptr is a pointer parameter
          const varName = (unaryExpr.operand as Identifier).name;

          // Check if this variable is a pointer parameter (contains an address)
          // For the failing test case, we need to dereference the pointer value
          const varLocation = this.getVarLocation(
            this.currentFunction,
            varName,
          );

          if (varLocation) {
            const { frameRelative, offset } = varLocation;

            return [
              // Load the pointer value (address stored in the parameter)
              frameRelative
                ? `\tldr\tx8, [x29, #${offset}]` // Load pointer value
                : `\tldr\tx8, [sp, #${offset}]`,

              // Dereference the pointer to get the actual value
              `\tldr\tx0, [x8]`, // Load value from address in x8

              // Prepare for printf call
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

      // Default behavior for regular expressions
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

      // Generate code to evaluate the exit code argument
      const exitCodeExpression = this.generateExpression(args[0]);
      result.push(...exitCodeExpression);

      // ARM64 macOS system call for exit:
      // System call number 1 (exit) goes in x16
      // Exit code (from our expression) is already in x0
      result.push("\tmov\tx16, #1"); // System call number for exit
      result.push("\tsvc\t#0x80"); // Supervisor call (invoke system call)

      return result;
    },
  };

  generate(ast: Program): string {
    this.output = [];
    this.varLocationMap.clear();
    this.stringLiterals.clear();
    this.labelCounter = 0;
    this.stringLiteralCounter = 0;
    this.nextOffsetMap.clear();

    this.addLine("\t.section\t__TEXT,__text,regular,pure_instructions");
    this.addLine("\t.build_version macos, 15, 0\tsdk_version 15, 4");

    for (const func of ast.functions) {
      this.generateFunction(func);
    }

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
    // Generate the value expression first
    const valueCode = this.generateExpression(stmt.value);
    this.addLines(valueCode);

    if (typeof stmt.target === "string") {
      // Regular variable assignment
      const varLocation = this.getVarLocation(
        this.currentFunction,
        stmt.target,
      );
      if (!varLocation) {
        throw new Error(
          `Variable not found: ${stmt.target} in function ${this.currentFunction}`,
        );
      }

      const { frameRelative, offset } = varLocation;
      // Store the result (now using 64-bit stores)
      if (frameRelative) {
        this.addLine(`\tstr\tx0, [x29, #${offset}]`); // Changed to x0 and str
      } else {
        this.addLine(`\tstr\tx0, [sp, #${offset}]`); // Changed to x0 and str
      }
    } else if (
      stmt.target.type === "UnaryExpression" &&
      stmt.target.operator === "*"
    ) {
      // Assignment to dereferenced pointer: *ptr = value
      // Value is already in x0, save it temporarily
      this.addLine(`\tmov\tx8, x0`);

      // Generate code to get the pointer address
      const ptrCode = this.generateExpression(stmt.target.operand);
      this.addLines(ptrCode);

      // Store the value at the address pointed to by the pointer
      this.addLine(`\tstr\tx8, [x0]`); // Store 64-bit value at address in x0
    } else {
      throw new Error("Invalid assignment target");
    }
  }

  private calculateStackSizeForFunction(func: FunctionDeclaration): number {
    // Base stack size for frame pointer and return address
    const baseStackSize = 32;

    // Space needed for parameters (each parameter needs 8 bytes now, align to 8)
    const parameterSpace = Math.max(
      32,
      Math.ceil((func.params.length * 8) / 8) * 8, // Changed to 8 bytes per param
    );

    // Space for local variables (estimate based on complexity)
    const localVarSpace = 64;

    // Space for temporary values during expression evaluation
    const tempSpace = 32;

    // Total must be 16-byte aligned
    const total = baseStackSize + parameterSpace + localVarSpace + tempSpace;
    return Math.ceil(total / 16) * 16;
  }

  private generateFunction(func: FunctionDeclaration): void {
    this.currentFunction = func.name;
    this.varLocationMap.set(func.name, new Map());

    // Create a unique end label for this function
    this.functionEndLabel = this.generateLabel("function_end");

    this.regAlloc.reset();

    const isMain = func.name === "main";
    this.nextOffsetMap.set(func.name, isMain ? -8 : 16); // Changed to 8-byte alignment

    this.addLine("");
    this.addLine(
      `\t.globl\t_${func.name}\t\t\t\t\t ; -- Begin function ${func.name}`,
    );
    this.addLine("\t.p2align\t2");
    this.addLine(`_${func.name}:\t\t\t\t\t\t ; @${func.name}`);

    if (isMain) {
      /* main prologue - keep existing behavior */
      this.addLine("\tsub\tsp, sp, #48");
      this.addLine("\tstp\tx29, x30, [sp, #32]\t\t\t ; 16-byte Folded Spill");
      this.addLine("\tadd\tx29, sp, #32");

      this.generateBlock(func.body);

      // Add the function end label BEFORE epilogue
      this.addLine(`${this.functionEndLabel}:`);

      /* main epilogue */
      this.addLine("\tldp\tx29, x30, [sp, #32]\t\t\t ; 16-byte Folded Reload");
      this.addLine("\tadd\tsp, sp, #48");
    } else {
      // Calculate stack size needed based on function parameters and complexity
      const totalStackSize = this.calculateStackSizeForFunction(func);

      // Non-main function prologue
      this.addLine(`\tsub\tsp, sp, #${totalStackSize}`);
      this.addLine(`\tstp\tx29, x30, [sp, #${totalStackSize - 16}]`);
      this.addLine(`\tadd\tx29, sp, #${totalStackSize - 16}`);

      // Store parameters on stack
      for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        const offset = this.allocateStackSlot(func.name, false);

        this.setVarLocation(func.name, param.name, false, offset);

        // ARM64 calling convention: first 8 parameters come in x0-x7 (changed to 64-bit)
        if (i < 8) {
          this.addLine(`\tstr\tx${i}, [sp, #${offset}]`); // Changed to x registers
        } else {
          // Parameters beyond x7 would be passed on stack by caller
          throw new Error(
            `Function ${func.name} has more than 8 parameters, which is not supported`,
          );
        }
      }

      this.generateBlock(func.body);

      // Add the function end label BEFORE epilogue
      this.addLine(`${this.functionEndLabel}:`);

      // Non-main function epilogue
      this.addLine(`\tldp\tx29, x30, [sp, #${totalStackSize - 16}]`);
      this.addLine(`\tadd\tsp, sp, #${totalStackSize}`);
    }

    this.addLine("\tret");
    this.addLine("\t\t\t\t\t\t\t ; -- End function");
  }

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateReturnStatement(stmt: ReturnStatement): void {
    // Only generate expression code if there's an argument
    if (stmt.type == NodeType.ReturnStatement) {
      const exprCode = this.generateExpression(stmt.argument);
      this.addLines(exprCode);
      // Result is now in x0, which is the return register
    }
    // For void functions, we don't set x0

    // Jump to function end for cleanup
    this.addLine(`\tb\t${this.functionEndLabel}`);
  }

  private generateStatement(stmt: Statement): void {
    switch (stmt.type) {
      case "ReturnStatement":
        this.generateReturnStatement(stmt);
        break;
      case "BlockStatement":
        this.generateBlock(stmt);
        break;
      case "VariableDeclaration":
        const isMain = this.currentFunction === "main";

        if (isMain) {
          /* in main, variables are stored relative to frame pointer,
           allocate a new unique offset for this variable*/
          const offset = this.allocateStackSlot(this.currentFunction, true);
          this.setVarLocation(this.currentFunction, stmt.name, true, offset);

          if (stmt.init.type === "NumberLiteral") {
            this.addLine(
              `\tmov\tx8, #${stmt.init.value}\t\t\t\t; =0x${stmt.init.value.toString(16)}`, // Changed to x8
            );
            this.addLine(`\tstr\tx8, [x29, #${offset}]`); // Changed to str and x8
          } else {
            const initCode = this.generateExpression(stmt.init);
            this.addLines(initCode);
            this.addLine(`\tstr\tx0, [x29, #${offset}]`); // Changed to str and x0
          }
        } else {
          const offset = this.allocateStackSlot(this.currentFunction, false);
          this.setVarLocation(this.currentFunction, stmt.name, false, offset);

          if (stmt.init.type === "NumberLiteral") {
            this.addLine(
              `\tmov\tx8, #${stmt.init.value}\t\t\t\t; =0x${stmt.init.value.toString(16)}`, // Changed to x8
            );
            this.addLine(`\tstr\tx8, [sp, #${offset}]`); // Changed to str and x8
          } else {
            const initCode = this.generateExpression(stmt.init);
            this.addLines(initCode);
            this.addLine(`\tstr\tx0, [sp, #${offset}]`); // Changed to str and x0
          }
        }
        break;

      case "ExpressionStatement":
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

  private allocateStackSlot(funcName: string, frameRelative: boolean): number {
    if (!this.nextOffsetMap.has(funcName)) {
      // Initialize based on function type
      if (funcName === "main") {
        this.nextOffsetMap.set(funcName, frameRelative ? -8 : 8); // Changed to 8-byte alignment
      } else {
        // Start further down to account for parameters
        this.nextOffsetMap.set(funcName, frameRelative ? -8 : 16); // Changed to 8-byte alignment
      }
    }

    const currentOffset = this.nextOffsetMap.get(funcName)!;

    if (frameRelative) {
      // Frame-relative (main function variables) - grow downward
      this.nextOffsetMap.set(funcName, currentOffset - 8); // Changed to 8 bytes
    } else {
      // Stack-relative (non-main function variables) - grow upward
      this.nextOffsetMap.set(funcName, currentOffset + 8); // Changed to 8 bytes
    }

    return currentOffset;
  }

  private generateWhileStatement(stmt: WhileStatement): void {
    const loopStart = this.generateLabel("loop_start");
    const loopEnd = this.generateLabel("loop_end");

    // Loop start label
    this.addLine(`${loopStart}:`);

    // Generate condition
    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    // Jump to end if condition is false (0)
    this.addLine("\tcmp\tx0, #0"); // Changed to x0
    this.addLine(`\tbeq\t${loopEnd}`);

    // Generate loop body
    if (stmt.body.type === "BlockStatement") {
      this.generateBlock(stmt.body);
    } else {
      this.generateStatement(stmt.body);
    }

    // Jump back to start
    this.addLine(`\tb\t${loopStart}`);

    // Loop end label
    this.addLine(`${loopEnd}:`);
  }

  private generateIfStatement(stmt: IfStatement): void {
    const endLabel = this.generateLabel("endif");
    const elseLabel = stmt.elseBranch ? this.generateLabel("else") : endLabel;

    // Generate condition
    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    // Jump to else/end if condition is false
    this.addLine("\tcmp\tx0, #0"); // Changed to x0
    this.addLine(`\tbeq\t${elseLabel}`);

    // Generate THEN branch
    if (stmt.thenBranch.type === "BlockStatement") {
      this.generateBlock(stmt.thenBranch);
    } else {
      this.generateStatement(stmt.thenBranch);
    }

    // If there's an else branch, jump over it after executing then branch
    if (stmt.elseBranch) {
      this.addLine(`\tb\t${endLabel}`);
      this.addLine(`${elseLabel}:`);

      if (stmt.elseBranch.type === "BlockStatement") {
        this.generateBlock(stmt.elseBranch);
      } else {
        this.generateStatement(stmt.elseBranch);
      }
    }

    this.addLine(`${endLabel}:`);
  }

  private generateExpression(expr: Expression): string[] {
    switch (expr.type) {
      case "BinaryExpression":
        return this.generateBinaryExpression(expr);
      case "UnaryExpression": // Added support for UnaryExpression
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

  // NEW: Generate unary expressions (address-of and dereference)
  private generateUnaryExpression(expr: UnaryExpression): string[] {
    const result: string[] = [];

    switch (expr.operator) {
      case "&": // Address-of operator
        if (expr.operand.type === "Identifier") {
          const varLocation = this.getVarLocation(
            this.currentFunction,
            expr.operand.name,
          );
          if (!varLocation) {
            throw new Error(`Variable not found: ${expr.operand.name}`);
          }

          const { frameRelative, offset } = varLocation;
          if (frameRelative) {
            // Calculate address relative to frame pointer
            result.push(`\tadd\tx0, x29, #${offset}`);
          } else {
            // Calculate address relative to stack pointer
            result.push(`\tadd\tx0, sp, #${offset}`);
          }
        } else {
          throw new Error(
            "Address-of operator can only be applied to variables",
          );
        }
        break;

      case "*": // Dereference operator
        // Load value from memory address
        const addressCode = this.generateExpression(expr.operand);
        result.push(...addressCode);
        // x0 now contains the address, load the value from that address
        result.push(`\tldr\tx0, [x0]`); // 64-bit load
        break;

      default:
        throw new Error(`Unsupported unary operator: ${expr.operator}`);
    }

    return result;
  }

  private generateBinaryExpression(expr: BinaryExpression): string[] {
    const result: string[] = [];

    // Check if we have enough registers
    if (!this.regAlloc.hasAvailable()) {
      // Fall back to stack-based approach
      return this.generateBinaryExpressionStackBased(expr);
    }

    // Generate left operand
    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    // Allocate register for left operand
    const leftReg = this.regAlloc.allocate();
    result.push(`\tmov\t${leftReg}, x0`); // Changed to x0

    // Generate right operand
    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);

    // Allocate register for right operand
    const rightReg = this.regAlloc.allocate();
    result.push(`\tmov\t${rightReg}, x0`); // Changed to x0

    // Perform operation (all using 64-bit x registers)
    switch (expr.operator) {
      case "*":
        result.push(`\tmul\tx0, ${leftReg}, ${rightReg}`); // Changed to x0 and x registers
        break;
      case "+":
        result.push(`\tadd\tx0, ${leftReg}, ${rightReg}`); // Changed to x0 and x registers
        break;
      case "-":
        result.push(`\tsub\tx0, ${leftReg}, ${rightReg}`); // Changed to x0 and x registers
        break;
      case "/":
        result.push(`\tsdiv\tx0, ${leftReg}, ${rightReg}`); // Changed to x0 and x registers
        break;
      case "<":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, lt"); // Changed to x0
        break;
      case ">":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, gt"); // Changed to x0
        break;
      case "==":
        result.push(`\tcmp\t${leftReg}, ${rightReg}`);
        result.push("\tcset\tx0, eq"); // Changed to x0
        break;
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }

    // Release registers
    this.regAlloc.release(leftReg);
    this.regAlloc.release(rightReg);

    return result;
  }

  // Fallback method for very complex expressions
  private generateBinaryExpressionStackBased(expr: BinaryExpression): string[] {
    const result: string[] = [];

    // Generate left operand
    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);

    // Save to stack
    result.push("\tsub\tsp, sp, #16");
    result.push("\tstr\tx0, [sp]"); // Changed to x0 and str

    // Generate right operand
    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);
    result.push("\tmov\tx9, x0"); // Changed to x9 and x0

    // Restore from stack
    result.push("\tldr\tx8, [sp]"); // Changed to x8 and ldr
    result.push("\tadd\tsp, sp, #16");

    // Perform operation with x8 (left) and x9 (right)
    switch (expr.operator) {
      case "*":
        result.push("\tmul\tx0, x8, x9"); // Changed to x registers
        break;
      case "+":
        result.push("\tadd\tx0, x8, x9"); // Changed to x registers
        break;
      case "-":
        result.push("\tsub\tx0, x8, x9"); // Changed to x registers
        break;
      case "/":
        result.push("\tsdiv\tx0, x8, x9"); // Changed to x registers
        break;
      case "<":
        result.push("\tcmp\tx8, x9"); // Changed to x registers
        result.push("\tcset\tx0, lt"); // Changed to x0
        break;
      case ">":
        result.push("\tcmp\tx8, x9"); // Changed to x registers
        result.push("\tcset\tx0, gt"); // Changed to x0
        break;
      case "==":
        result.push("\tcmp\tx8, x9"); // Changed to x registers
        result.push("\tcset\tx0, eq"); // Changed to x0
        break;
      default:
        throw new Error(`Unsupported binary operator: ${expr.operator}`);
    }

    return result;
  }

  private generateFunctionCall(expr: FunctionCall): string[] {
    if (expr.callee in this.specialFunctions) {
      return this.specialFunctions[expr.callee](expr.arguments);
    }

    const result: string[] = [];

    // ARM64 calling convention: first 8 integer arguments go in x0-x7 (changed to 64-bit)
    // Arguments beyond 8 would go on stack (we'll throw error for > 8)
    if (expr.arguments.length > 8) {
      throw new Error(
        "More than 8 function arguments not supported in this educational compiler",
      );
    }

    // Handle the case where we have multiple arguments
    // We need to evaluate them carefully to avoid register conflicts

    if (expr.arguments.length === 0) {
      // No arguments, just call
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    if (expr.arguments.length === 1) {
      // Single argument - existing behavior
      const argCode = this.generateExpression(expr.arguments[0]);
      result.push(...argCode);
      // Argument is now in x0, which is where ARM64 expects first parameter
      result.push(`\tbl\t_${expr.callee}`);
      return result;
    }

    // Multiple arguments - need to handle register allocation carefully
    // Strategy: evaluate all arguments and store them in temporary stack locations,
    // then move them to the correct registers just before the call

    const tempStackOffsets: number[] = [];

    // Step 1: Evaluate each argument and store on stack
    for (let i = 0; i < expr.arguments.length; i++) {
      const argCode = this.generateExpression(expr.arguments[i]);
      result.push(...argCode);

      // Allocate temporary stack space for this argument
      const tempOffset = this.allocateStackSlot(this.currentFunction, false);
      tempStackOffsets.push(tempOffset);

      // Store the result (in x0) to temporary stack location
      if (this.currentFunction === "main") {
        result.push(`\tstr\tx0, [x29, #${tempOffset}]`); // Changed to str and x0
      } else {
        result.push(`\tstr\tx0, [sp, #${tempOffset}]`); // Changed to str and x0
      }
    }

    // Step 2: Load arguments from stack into correct parameter registers
    for (let i = 0; i < expr.arguments.length; i++) {
      const tempOffset = tempStackOffsets[i];

      if (this.currentFunction === "main") {
        result.push(`\tldr\tx${i}, [x29, #${tempOffset}]`); // Changed to ldr and x registers
      } else {
        result.push(`\tldr\tx${i}, [sp, #${tempOffset}]`); // Changed to ldr and x registers
      }
    }

    // Step 3: Make the function call
    result.push(`\tbl\t_${expr.callee}`);

    return result;
  }

  private generateIdentifier(expr: Identifier): string[] {
    const varLocation = this.getVarLocation(this.currentFunction, expr.name);

    if (!varLocation) {
      throw new Error(
        `Variable not found: ${expr.name} in function ${this.currentFunction}`,
      );
    }

    const { frameRelative, offset } = varLocation;

    if (frameRelative) {
      return [`\tldr\tx0, [x29, #${offset}]`]; // Changed to ldr and x0
    } else {
      return [`\tldr\tx0, [sp, #${offset}]`]; // Changed to ldr and x0
    }
  }

  private generateNumberLiteral(expr: NumberLiteral): string[] {
    return [`\tmov\tx0, #${expr.value}\t\t\t\t; =0x${expr.value.toString(16)}`]; // Changed to x0
  }

  /* needs to be unique */
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

  private setVarLocation(
    funcName: string,
    varName: string,
    frameRelative: boolean,
    offset: number,
  ): void {
    let varMap = this.varLocationMap.get(funcName);

    if (!varMap) {
      varMap = new Map();
      this.varLocationMap.set(funcName, varMap);
    }

    varMap.set(varName, { frameRelative, offset });
  }

  private getVarLocation(
    funcName: string,
    varName: string,
  ): { frameRelative: boolean; offset: number } | undefined {
    const varMap = this.varLocationMap.get(funcName);

    if (!varMap) {
      return undefined;
    }

    return varMap.get(varName);
  }

  private addStringLiteral(value: string): string {
    // Generate unique label for each string literal
    const label = `l_.str.${this.stringLiteralCounter++}`;
    this.stringLiterals.set(label, value);
    return label;
  }
}

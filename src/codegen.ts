import {
  BinaryExpression,
  BlockStatement,
  Expression,
  FunctionCall,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  NumberLiteral,
  Program,
  Statement,
} from "./parser";

export class ARM64CodeGenerator {
  private output: string[] = [];
  private currentFunction: string = "";
  private varLocationMap: Map<
    string,
    Map<string, { frameRelative: boolean; offset: number }>
  > = new Map();
  private stringLiterals: Map<string, string> = new Map();
  private labelCounter: number = 0;

  private nextOffsetMap: Map<string, number> = new Map();

  /**
   * because there's no way I'm writing a linker, we're going to
   * cheat by hard coding calls to external functions, in this case, printf.
   * anything more sophisticated is well beyond the scope
   */
  private specialFunctions: Record<string, (args: Expression[]) => string[]> = {
    printf: (args: Expression[]) => {
      const formatString = "%d\\n";
      const label = this.addStringLiteral(formatString);
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
  };

  generate(ast: Program): string {
    this.output = [];
    this.varLocationMap.clear();
    this.stringLiterals.clear();
    this.labelCounter = 0;
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

  private generateFunction(func: FunctionDeclaration): void {
    this.currentFunction = func.name;
    this.varLocationMap.set(func.name, new Map());

    const isMain = func.name === "main";
    this.nextOffsetMap.set(func.name, isMain ? -4 : 8);

    this.addLine("");
    this.addLine(
      `\t.globl\t_${func.name}\t\t\t\t\t ; -- Begin function ${func.name}`
    );
    this.addLine("\t.p2align\t2");
    this.addLine(`_${func.name}:\t\t\t\t\t\t ; @${func.name}`);

    if (isMain) {
      /* main prologue */
      this.addLine("\tsub\tsp, sp, #48");
      this.addLine("\tstp\tx29, x30, [sp, #32]\t\t\t ; 16-byte Folded Spill");
      this.addLine("\tadd\tx29, sp, #32");

      this.generateBlock(func.body);

      /* main epilogue */
      this.addLine("\tldp\tx29, x30, [sp, #32]\t\t\t ; 16-byte Folded Reload");
      this.addLine("\tadd\tsp, sp, #48");
    } else {
      this.addLine("\tsub\tsp, sp, #32");

      for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        const offset = this.allocateStackSlot(func.name, false);

        this.setVarLocation(func.name, param.name, false, offset);
        this.addLine(`\tstr\tw${i}, [sp, #${offset}]`);
      }

      this.generateBlock(func.body);

      /*regular function epilogue*/
      this.addLine("\tadd\tsp, sp, #32");
    }

    this.addLine("\tret");
    this.addLine("\t\t\t\t\t\t\t ; -- End function");
  }

  private generateBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.generateStatement(stmt);
    }
  }

  private generateStatement(stmt: Statement): void {
    switch (stmt.type) {
      case "ReturnStatement":
        const returnCode = this.generateExpression(stmt.argument);
        this.addLines(returnCode);
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
              `\tmov\tw8, #${
                stmt.init.value
              }\t\t\t\t; =0x${stmt.init.value.toString(16)}`
            );
            this.addLine(`\tstur\tw8, [x29, #${offset}]`);
          } else {
            const initCode = this.generateExpression(stmt.init);
            this.addLines(initCode);
            this.addLine(`\tstur\tw0, [x29, #${offset}]`);
          }
        } else {
          const offset = this.allocateStackSlot(this.currentFunction, false);
          this.setVarLocation(this.currentFunction, stmt.name, false, offset);

          if (stmt.init.type === "NumberLiteral") {
            this.addLine(
              `\tmov\tw8, #${
                stmt.init.value
              }\t\t\t\t; =0x${stmt.init.value.toString(16)}`
            );
            this.addLine(`\tstr\tw8, [sp, #${offset}]`);
          } else {
            const initCode = this.generateExpression(stmt.init);
            this.addLines(initCode);
            this.addLine(`\tstr\tw0, [sp, #${offset}]`);
          }
        }
        break;

      case "ExpressionStatement":
        const exprCode = this.generateExpression(stmt.expression);
        this.addLines(exprCode);
        break;

      case "IfStatement":
        this.generateIfStatement(stmt);
        break;
    }
  }

  private allocateStackSlot(funcName: string, frameRelative: boolean): number {
    const currentOffset = this.nextOffsetMap.get(funcName) || 0;

    /* update the next available offset
     for frame-relative offsets (in main), we go more negative
     for stack-relative offsets, we increase*/
    const newOffset = frameRelative
      ? currentOffset - 4 /* move 4 bytes down in frame-relative addressing*/
      : currentOffset + 4; /* move 4 bytes up in stack-relative addressing*/

    this.nextOffsetMap.set(funcName, newOffset);

    return currentOffset;
  }

  private generateIfStatement(stmt: IfStatement): void {
    const endLabel = this.generateLabel("endif");
    const elseLabel = stmt.elseBranch ? this.generateLabel("else") : endLabel;

    const conditionCode = this.generateExpression(stmt.condition);
    this.addLines(conditionCode);

    this.addLine("\tcmp\tw0, #0");
    this.addLine(`\tbeq\t${elseLabel}`);

    if (stmt.thenBranch.type === "BlockStatement") {
      this.generateBlock(stmt.thenBranch);
    } else {
      this.generateStatement(stmt.thenBranch);
    }

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

      case "FunctionCall":
        return this.generateFunctionCall(expr);

      case "Identifier":
        return this.generateIdentifier(expr);

      case "NumberLiteral":
        return this.generateNumberLiteral(expr);

      default:
        return [];
    }
  }

  private generateBinaryExpression(expr: BinaryExpression): string[] {
    const result: string[] = [];

    const leftCode = this.generateExpression(expr.left);
    result.push(...leftCode);
    result.push("\tmov\tw8, w0");

    const rightCode = this.generateExpression(expr.right);
    result.push(...rightCode);
    result.push("\tmov\tw9, w0");

    switch (expr.operator) {
      case "*":
        result.push("\tmul\tw0, w8, w9");
        break;
      case "+":
        result.push("\tadd\tw0, w8, w9");
        break;
      case "-":
        result.push("\tsub\tw0, w8, w9");
        break;
      case "/":
        result.push("\tsdiv\tw0, w8, w9");
        break;
      case "<":
        result.push("\tcmp\tw8, w9");
        result.push("\tcset\tw0, lt");
        break;
      case ">":
        result.push("\tcmp\tw8, w9");
        result.push("\tcset\tw0, gt");
        break;
      case "==":
        result.push("\tcmp\tw8, w9");
        result.push("\tcset\tw0, eq");
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

    for (let i = 0; i < expr.arguments.length; i++) {
      const argCode = this.generateExpression(expr.arguments[i]);
      result.push(...argCode);

      if (i > 0) {
        result.push(`\tmov\tw${i}, w0`);
      }
    }

    result.push(`\tbl\t_${expr.callee}`);

    return result;
  }

  private generateIdentifier(expr: Identifier): string[] {
    const varLocation = this.getVarLocation(this.currentFunction, expr.name);

    if (!varLocation) {
      throw new Error(
        `Variable not found: ${expr.name} in function ${this.currentFunction}`
      );
    }

    const { frameRelative, offset } = varLocation;

    if (frameRelative) {
      return [`\tldur\tw0, [x29, #${offset}]`];
    } else {
      return [`\tldr\tw0, [sp, #${offset}]`];
    }
  }

  private generateNumberLiteral(expr: NumberLiteral): string[] {
    return [`\tmov\tw0, #${expr.value}\t\t\t\t; =0x${expr.value.toString(16)}`];
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
    offset: number
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
    varName: string
  ): { frameRelative: boolean; offset: number } | undefined {
    const varMap = this.varLocationMap.get(funcName);

    if (!varMap) {
      return undefined;
    }

    return varMap.get(varName);
  }

  private addStringLiteral(value: string): string {
    const label = "l_.str";
    this.stringLiterals.set(label, value);
    return label;
  }
}
